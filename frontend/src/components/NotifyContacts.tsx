import { MessageCircle } from "lucide-react";
import type { Contact } from "../types";
import { whatsappHref, whatsappShareHref } from "../lib/tripNotify";

type Props = {
  contacts: Contact[];
  body: string;
  heading?: string;
  hint?: string;
};

export function NotifyContacts({
  contacts,
  body,
  heading = "Notify on WhatsApp",
  hint = "Free. Opens WhatsApp with pickup, drop, driver, vehicle, and the live tracking link. Tap Send in WhatsApp.",
}: Props) {
  const first = contacts[0];
  const primaryHref = first ? whatsappHref(first.phone, body) : whatsappShareHref(body);

  return (
    <section className="card mt-4 space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">{heading}</h2>
        <p className="mt-1 text-xs text-muted">{hint}</p>
      </div>
      <a href={primaryHref} target="_blank" rel="noreferrer" className="btn-primary w-full py-3">
        <MessageCircle className="mr-2 h-4 w-4" />
        {contacts.length <= 1 ? "Send on WhatsApp" : `WhatsApp ${first?.name ?? "contact"}`}
      </a>
      {contacts.length > 1 && (
        <p className="text-xs text-muted">Then tap WhatsApp for each other contact below.</p>
      )}
      <ul className="space-y-2">
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
            <span>
              <span className="font-medium">{c.name}</span>
              <span className="block text-xs text-muted">{c.phone}</span>
            </span>
            <a
              className="btn-secondary px-3 py-1.5 text-xs"
              href={whatsappHref(c.phone, body)}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
