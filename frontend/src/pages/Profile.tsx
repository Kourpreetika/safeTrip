import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

export function ProfilePage() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api("/api/users/me", { method: "PATCH", body: JSON.stringify({ name, phone }) });
    await refresh();
    toast("Profile saved.");
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="page-title">My Profile</h1>
      <p className="page-lead">
        Live location is only shared after you start a journey, with the contacts you select or anyone who has the
        tracking link.
      </p>
      <form onSubmit={onSubmit} className="card mt-6 space-y-4 p-5">
        <label>
          <span className="field-label">Name</span>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          <span className="field-label">Phone</span>
          <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label>
          <span className="field-label">Email</span>
          <input className="input-field" value={user?.email ?? ""} disabled />
        </label>
        <button type="submit" className="btn-primary w-full">
          Save
        </button>
      </form>
      <button
        type="button"
        className="mt-4 w-full rounded-xl py-2 text-sm text-muted hover:text-ink"
        onClick={async () => {
          await logout();
          navigate("/");
        }}
      >
        Logout
      </button>
    </div>
  );
}
