import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import type { AppRole } from "@/types/auth";

export default function ProtectedRoute({
  children,
  requireRole,
}: {
  children: JSX.Element;
  requireRole?: AppRole;
}) {
  const location = useLocation();
  const { loading, isAuthenticated, access } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="rounded-3xl border border-gray-200 bg-white px-6 py-5 shadow-sm text-center">
          <div className="text-sm font-semibold text-gray-900">Loading access…</div>
          <div className="mt-1 text-xs text-gray-500">Checking your Digital RevTrack session</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (!access) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg rounded-3xl border border-amber-200 bg-white px-6 py-6 shadow-sm">
          <div className="text-lg font-bold text-gray-900">You’re signed in, but don’t have dashboard access yet.</div>
          <p className="mt-2 text-sm text-gray-600">
            Ask an editor to invite your email address in Settings so they can assign either read-only or editor access.
          </p>
        </div>
      </div>
    );
  }

  if (requireRole && access.role !== requireRole) {
    return <Navigate to="/global" replace />;
  }

  return children;
}
