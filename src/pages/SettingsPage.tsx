import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Globe2, Mail, Settings2, Shield, UserPlus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { AppRole, AppUserAccess } from "@/types/auth";

const ROLE_OPTIONS: { value: AppRole; label: string; help: string }[] = [
  { value: "editor", label: "Editor", help: "Can edit dashboard inputs, ARR tracker rows, and user access." },
  { value: "read_only", label: "Read only", help: "Can sign in and review dashboards, but cannot change data." },
];

export default function SettingsPage() {
  const { access, user, refreshAccess } = useAuth();
  const [users, setUsers] = useState<AppUserAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("read_only");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("app_users")
      .select("id,email,role,created_at,updated_at,invited_by_email")
      .order("email", { ascending: true });

    if (loadError) {
      setError(loadError.message);
      setUsers([]);
    } else {
      setUsers((data as AppUserAccess[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user?.email) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const normalizedEmail = inviteEmail.trim().toLowerCase();

    const { error: upsertError } = await supabase
      .from("app_users")
      .upsert(
        {
          email: normalizedEmail,
          role: inviteRole,
          invited_by_email: user.email.toLowerCase(),
        },
        { onConflict: "email" },
      );

    if (upsertError) {
      setError(upsertError.message);
      setSubmitting(false);
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/global`,
      },
    });

    if (otpError) {
      setError(otpError.message);
      setSubmitting(false);
      return;
    }

    setInviteEmail("");
    setInviteRole("read_only");
    setMessage(`Invite sent to ${normalizedEmail}.`);
    setSubmitting(false);
    await loadUsers();
    await refreshAccess();
  }

  async function handleRoleChange(entry: AppUserAccess, nextRole: AppRole) {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("app_users")
      .update({ role: nextRole })
      .eq("id", entry.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadUsers();
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">AI Digital RevTrack</div>
              <h1 className="text-lg font-bold text-gray-950">User Settings</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/global"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
            >
              <Globe2 className="h-4 w-4" /> Global Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-950">Invite a teammate</h2>
                <p className="text-sm text-gray-500">Send them a magic-link sign-in email and assign their permission level.</p>
              </div>
            </div>

            <form onSubmit={handleInvite} className="mt-6 space-y-4">
              <label className="block">
                <div className="mb-2 text-sm font-semibold text-gray-700">Email address</div>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
              </label>

              <div>
                <div className="mb-2 text-sm font-semibold text-gray-700">Permission</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ROLE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setInviteRole(option.value)}
                      className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                        inviteRole === option.value
                          ? "border-violet-300 bg-violet-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{option.label}</div>
                      <div className="mt-1 text-sm text-gray-500">{option.help}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
              {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {submitting ? "Sending invite…" : "Invite user"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-950">Your access</h2>
                <p className="text-sm text-gray-500">The signed-in user and their current permission level.</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Signed in as</div>
              <div className="mt-2 text-base font-bold text-gray-900">{access?.email ?? user?.email ?? "Unknown"}</div>
              <div className="mt-3 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-700">
                {access?.role === "editor" ? "Editor" : "Read only"}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-950">Users and permissions</h2>
              <p className="text-sm text-gray-500">Editors can change access levels at any time.</p>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              Loading users…
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Permission</th>
                    <th className="px-3 py-3">Invited by</th>
                    <th className="px-3 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-3 py-3 font-medium text-gray-900">{entry.email}</td>
                      <td className="px-3 py-3">
                        <select
                          value={entry.role}
                          onChange={(event) => void handleRoleChange(entry, event.target.value as AppRole)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-300"
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-gray-500">{entry.invited_by_email || "—"}</td>
                      <td className="px-3 py-3 text-gray-500">
                        {entry.updated_at ? new Date(entry.updated_at).toLocaleString("en-GB") : "—"}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-10 text-center text-sm text-gray-500">
                        No users have been invited yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
