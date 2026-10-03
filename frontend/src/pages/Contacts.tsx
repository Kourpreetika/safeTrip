import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { ApiError } from "../api/client";
import type { Contact } from "../types";

export function ContactsPage() {
  const toast = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  async function load() {
    const d = await api<{ contacts: Contact[] }>("/api/contacts");
    setContacts(d.contacts);
  }

  useEffect(() => {
    void load();
  }, []);

  function fill(c?: Contact) {
    setName(c?.name ?? "");
    setPhone(c?.phone ?? "");
    setEmail(c?.email ?? "");
    setRelationship(c?.relationship ?? "");
    setEditing(c?.id ?? null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await api(`/api/contacts/${editing}`, {
          method: "PUT",
          body: JSON.stringify({ name, phone, email, relationship }),
        });
        toast("Contact updated.");
      } else {
        await api("/api/contacts", {
          method: "POST",
          body: JSON.stringify({ name, phone, email, relationship }),
        });
        toast("Contact added.");
      }
      fill();
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not save contact.", "err");
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this contact?")) return;
    await api(`/api/contacts/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="page-title">Trusted Contacts</h1>
      <p className="page-lead">
        Save people you trust. When a trip starts, WhatsApp opens with pickup, drop, driver, vehicle, and a live tracking link — tap Send.
      </p>
      <form onSubmit={onSubmit} className="card mt-6 space-y-4 p-5">
        <label>
          <span className="field-label">Name</span>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          <span className="field-label">Indian mobile number</span>
          <input
            className="input-field"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            inputMode="numeric"
            placeholder="10-digit number, e.g. 9876543210"
          />
          <span className="mt-1 block text-xs text-muted">Must start with 6, 7, 8, or 9. +91 is optional.</span>
        </label>
        <label>
          <span className="field-label">Email (optional)</span>
          <input
            className="input-field"
            type="email"
            placeholder="Used for in-app alerts if they have an account"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          <span className="field-label">Relationship (optional)</span>
          <input
            className="input-field"
            placeholder="Mother, Friend…"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1">
            {editing ? "Save" : "Add contact"}
          </button>
          {editing && (
            <button type="button" className="btn-muted px-4" onClick={() => fill()}>
              Cancel
            </button>
          )}
        </div>
      </form>
      {contacts.length === 0 && (
        <div className="empty-state mt-6">
          <p>No contacts yet.</p>
          <p className="mt-1">Add someone you trust so they can follow your trips.</p>
        </div>
      )}
      <ul className="mt-6 space-y-2">
        {contacts.map((c) => (
          <li key={c.id} className="card flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-muted">
                {c.relationship ? `${c.relationship} · ` : ""}
                {c.phone}
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <button type="button" className="link" onClick={() => fill(c)}>
                Edit
              </button>
              <button type="button" className="font-medium text-sos hover:underline" onClick={() => remove(c.id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
