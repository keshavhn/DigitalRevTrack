import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import type { AppRole, AppUserAccess } from "@/types/auth";

interface AuthContextValue {
  loading: boolean;
  user: User | null;
  session: Session | null;
  access: AppUserAccess | null;
  role: AppRole | null;
  canEdit: boolean;
  isAuthenticated: boolean;
  hasSupabaseConfig: boolean;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchAccessForEmail(email: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("app_users")
    .select("id,email,role,created_at,updated_at,invited_by_email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AppUserAccess | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<AppUserAccess | null>(null);

  async function hydrate(nextSession: Session | null) {
    setSession(nextSession);

    if (!nextSession?.user?.email || !supabase) {
      setAccess(null);
      setLoading(false);
      return;
    }

    try {
      const nextAccess = await fetchAccessForEmail(nextSession.user.email);
      setAccess(nextAccess);
    } catch (error) {
      console.error("Failed to load app user access", error);
      setAccess(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        hydrate(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrate(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    user: session?.user ?? null,
    session,
    access,
    role: access?.role ?? null,
    canEdit: access?.role === "editor",
    isAuthenticated: Boolean(session?.user),
    hasSupabaseConfig,
    async signInWithEmail(email: string) {
      if (!supabase) {
        return { error: "Supabase is not configured yet." };
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/global`,
        },
      });

      return { error: error?.message ?? null };
    },
    async signOut() {
      if (!supabase) return;
      await supabase.auth.signOut();
    },
    async refreshAccess() {
      if (!session?.user?.email) return;
      const nextAccess = await fetchAccessForEmail(session.user.email);
      setAccess(nextAccess);
    },
  }), [access, loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
