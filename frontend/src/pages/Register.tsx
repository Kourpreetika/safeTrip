import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ApiError } from "../api/client";
import { GuestShell } from "../components/Layout";

export function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("Password must be at least 8 characters, with one letter and one number.");
      return;
    }
    setBusy(true);
    try {
      await register({ name, email, password, phone: phone.trim() || undefined });
      navigate("/app");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not create the account.";
      setError(message);
      toast(message, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GuestShell>
      <div className="mx-auto max-w-md px-4 py-10">
        <form onSubmit={onSubmit} className="card p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Create your account</p>
          <h1 className="page-title mt-1">Register</h1>
          <p className="page-lead">Create an account to share live trips with people you trust.</p>

          <label className="field-label mt-5">Full name</label>
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />

          <label className="field-label mt-4">Email</label>
          <input
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />

          <label className="field-label mt-4">Phone (optional)</label>
          <input
            className="input-field"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91…"
            autoComplete="tel"
          />

          <label className="field-label mt-4">Password</label>
          <input
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            required
          />
          <p className="mt-1.5 text-xs text-muted">At least 8 characters, with one letter and one number.</p>

          {error ? <p className="mt-4 text-sm font-medium text-sos">{error}</p> : null}

          <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
            {busy ? "Please wait…" : "Create account"}
          </button>
          <p className="mt-4 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link className="link" to="/login">
              Login
            </Link>
          </p>
        </form>
      </div>
    </GuestShell>
  );
}
