import { MessageCircle, Send } from "lucide-react";
import type { Contact } from "../types";
import { smsHref, whatsappHref } from "../lib/tripNotify";

type Props = {
  contacts: Contact[];
  body: string;
  heading?: string;
  hint?: string;
};

export function NotifyContacts({
  contacts,
  body,
  heading = "Notify trusted contacts",
  hint = "This is free. It opens SMS on your phone (your own plan). WhatsApp uses data only. Tap Send in the app that opens.",
}: Props) {
  const phones = contacts.map((c) => c.phone).filter(Boolean);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(body);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="card mt-4 space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">{heading}</h2>
        <p className="mt-1 text-xs text-muted">{hint}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <a href={smsHref(phones, body)} className="btn-primary py-3">
          <Send className="mr-2 h-4 w-4" />
          Send SMS
        </a>
        <button type="button" className="btn-muted py-3" onClick={() => void copyText()}>
          Copy message
        </button>
      </div>
      <ul className="space-y-2">
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
            <span>
              <span className="font-medium">{c.name}</span>
              <span className="block text-xs text-muted">{c.phone}</span>
            </span>
            <a
              className="link inline-flex items-center gap-1"
              href={whatsappHref(c.phone, body)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
