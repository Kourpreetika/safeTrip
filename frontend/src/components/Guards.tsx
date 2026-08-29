import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GuestShell } from "./Layout";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <GuestShell>
        <div className="grid min-h-[40vh] place-items-center text-sm text-muted">Loading SafeTrip…</div>
      </GuestShell>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user } = useAuth();
  if (user) return <Navigate to="/app" replace />;
  return <Outlet />;
}
