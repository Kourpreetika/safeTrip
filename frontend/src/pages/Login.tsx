import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ApiError } from "../api/client";
import { GuestShell } from "../components/Layout";

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      navigate("/app");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Login failed. Check email and password.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GuestShell>
      <div className="mx-auto max-w-md px-4 py-10">
        <form onSubmit={onSubmit} className="card p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Welcome back</p>
          <h1 className="page-title mt-1">Login</h1>
          <p className="page-lead">Sign in to start a journey or follow someone you trust.</p>

          <label className="field-label mt-5">Email</label>
          <input
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />

          <label className="field-label mt-4">Password</label>
          <input
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
            {busy ? "Please wait…" : "Login"}
          </button>
          <p className="mt-4 text-center text-sm text-muted">
            Don't have an account?{" "}
            <Link className="link" to="/register">
              Register
            </Link>
          </p>
        </form>
      </div>
    </GuestShell>
  );
}
