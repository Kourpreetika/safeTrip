import type { Journey } from "../types";

const PENDING_KEY = "safetrip.pendingNotify";

export type PendingNotify = {
  journeyId: string;
  phones: string[];
  body: string;
};

function clip(text: string, max = 72): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function indiaWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export function smsRecipients(phones: string[]): string[] {
  return phones
    .map((phone) => {
      const digits = phone.replace(/\D/g, "");
      if (digits.length === 10) return `+91${digits}`;
      if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
      if (phone.startsWith("+")) return phone.replace(/\s/g, "");
      return digits ? `+${digits}` : "";
    })
    .filter(Boolean);
}

export function tripNotifyText(journey: Journey, status: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const trackUrl = `${origin}/track/${journey.shareToken}`;
  const maps =
    journey.currentLat != null && journey.currentLng != null
      ? `https://maps.google.com/?q=${journey.currentLat},${journey.currentLng}`
      : `https://maps.google.com/?q=${journey.startLat},${journey.startLng}`;
  const eta = journey.etaMinutes != null ? `${journey.etaMinutes} min` : "updating";
  const rideBits = [journey.rideProvider, journey.rideId ? `ID ${journey.rideId}` : null].filter(Boolean).join(" · ");
  return [
    `SafeTrip: ${journey.user?.name ?? "A traveller"} — ${status}`,
    `From: ${clip(journey.startAddress)}`,
    `To: ${clip(journey.destAddress)}`,
    `Driver: ${journey.driverName} · ${journey.vehicleNumber}`,
    rideBits ? `Ride: ${rideBits}` : null,
    `ETA: ${eta}`,
    `Maps: ${maps}`,
    `Track: ${trackUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function smsHref(phones: string[], body: string): string {
  const nums = smsRecipients(phones);
  const encoded = encodeURIComponent(body);
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (nums.length === 0) return `sms:?&body=${encoded}`;
  if (ios) {
    return `sms:/open?addresses=${encodeURIComponent(nums.join(","))}&body=${encoded}`;
  }
  return `sms:${nums.join(",")}?body=${encoded}`;
}

export function openDeviceSms(phones: string[], body: string) {
  window.location.href = smsHref(phones, body);
}

export function whatsappHref(phone: string, body: string): string {
  return `https://wa.me/${indiaWhatsAppNumber(phone)}?text=${encodeURIComponent(body)}`;
}

export function whatsappShareHref(body: string): string {
  return `https://wa.me/?text=${encodeURIComponent(body)}`;
}

/** Opens WhatsApp to the first contact (or the share sheet if there is no number). Extra contacts stay as tap-to-send links. */
export function openWhatsApp(phones: string[], body: string) {
  const first = phones[0];
  const href = first ? whatsappHref(first, body) : whatsappShareHref(body);
  window.open(href, "_blank", "noopener,noreferrer");
}

export function queuePendingNotify(payload: PendingNotify) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
}

export function takePendingNotify(journeyId: string): PendingNotify | null {
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as PendingNotify;
    if (data.journeyId !== journeyId) return null;
    sessionStorage.removeItem(PENDING_KEY);
    return data;
  } catch {
    sessionStorage.removeItem(PENDING_KEY);
    return null;
  }
}
