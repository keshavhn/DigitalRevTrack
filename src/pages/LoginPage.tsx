import { FormEvent, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading, signInWithEmail, hasSupabaseConfig } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const next = useMemo(() => searchParams.get("next") || "/global", [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await signInWithEmail(email);
    if (result.error) {
      setError(result.error);
    } else {
      setMessage("Magic link sent. Open the email and use the sign-in link to continue.");
    }

    setSubmitting(false);
  }

  if (!loading && isAuthenticated) {
    return <Navigate to={next} replace />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.15),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_30px_80px_rgba(79,70,229,0.12)] backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-900 p-10 text-white">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                AI Digital RevTrack
              </div>
              <h1 className="mt-6 text-4xl font-bold leading-tight">Secure access for your sales and ARR dashboards.</h1>
              <p className="mt-4 max-w-md text-sm text-white/75">
                Editors can update inputs, invite teammates, and assign permissions. Read-only users can review the live dashboard without changing data.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <div className="text-sm font-semibold">Passwordless sign-in</div>
              </div>
              <p className="mt-2 text-sm text-white/70">
                We’ll email you a secure magic link. Access is granted only if your email has already been invited.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 md:p-10">
            <div className="md:hidden">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
                AI Digital RevTrack
              </div>
            </div>
            <div className="mt-6 md:mt-0">
              <h2 className="text-2xl font-bold text-gray-950">Sign in</h2>
              <p className="mt-2 text-sm text-gray-500">
                Use your invited work email to receive a secure sign-in link.
              </p>
            </div>

            {!hasSupabaseConfig && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Supabase auth is not configured yet. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before using login in production.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <label className="block">
                <div className="mb-2 text-sm font-semibold text-gray-700">Work email</div>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus-within:border-violet-300">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
              </label>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !hasSupabaseConfig}
                className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {submitting ? "Sending link…" : "Email me a sign-in link"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
