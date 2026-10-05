import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { GuestShell } from "../components/Layout";
import { useToast } from "../context/ToastContext";

export function ForgotPasswordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitReset(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, password, phone }),
      });
      toast("Password updated. Log in with your new password.");
      navigate("/login");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not reset the password.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GuestShell>
      <div className="mx-auto max-w-md px-4 py-10">
        <form onSubmit={submitReset} className="card p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Account recovery</p>
          <h1 className="page-title mt-1">Forgot password</h1>
          <p className="page-lead">
            Enter the email and 10-digit mobile number you registered with, then choose a new password.
          </p>

          <label className="field-label mt-5">Email</label>
          <input
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />

          <label className="field-label mt-4">Registered mobile number</label>
          <input
            className="input-field"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
            placeholder="10-digit number, e.g. 9622431393"
            required
          />

          <label className="field-label mt-4">New password</label>
          <input
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <p className="mt-2 text-xs text-muted">Password must be 8+ characters and include a letter and a number.</p>

          <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
            {busy ? "Please wait…" : "Update password"}
          </button>
          <p className="mt-4 text-center text-sm text-muted">
            Remembered it?{" "}
            <Link className="link" to="/login">
              Login
            </Link>
          </p>
        </form>
      </div>
    </GuestShell>
  );
}
