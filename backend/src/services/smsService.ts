import { config } from "../config.ts";
import { smsIntervalMs } from "../lib/smsSchedule.ts";
import { normalizeIndianMobile } from "../lib/phone.ts";

export function isSmsConfigured(): boolean {
  if (config.smsProvider === "twilio") {
    return Boolean(config.twilioAccountSid && config.twilioAuthToken && config.twilioFromNumber);
  }
  if (config.smsProvider === "msg91") {
    return Boolean(config.msg91AuthKey);
  }
  return false;
}

async function sendViaTwilio(toE164: string, body: string): Promise<boolean> {
  const sid = config.twilioAccountSid;
  const token = config.twilioAuthToken;
  const from = config.twilioFromNumber;
  if (!sid || !token || !from) return false;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({ To: toE164, From: from, Body: body });
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!response.ok) {
    const text = await response.text();
    console.error("Twilio SMS failed:", response.status, text);
    return false;
  }
  return true;
}

async function sendViaMsg91(toE164: string, body: string): Promise<boolean> {
  const key = config.msg91AuthKey;
  if (!key) return false;
  const mobile = toE164.replace("+", "");
  const response = await fetch("https://control.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      authkey: key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      template_id: config.msg91TemplateId,
      short_url: "0",
      recipients: [{ mobiles: mobile, VAR1: body }],
    }),
  });
  if (!response.ok) {
    // Fallback: simple SMS API (no DLT template).
    const quick = await fetch(
      `https://api.msg91.com/api/sendhttp.php?authkey=${encodeURIComponent(key)}&mobiles=${mobile}&message=${encodeURIComponent(body)}&sender=${encodeURIComponent(config.msg91SenderId)}&route=4&country=91`,
    );
    return quick.ok;
  }
  return true;
}

export async function sendSms(rawPhone: string, body: string): Promise<boolean> {
  if (!isSmsConfigured()) return false;
  const to = normalizeIndianMobile(rawPhone);
  if (!to) return false;
  try {
    if (config.smsProvider === "twilio") return await sendViaTwilio(to, body);
    if (config.smsProvider === "msg91") return await sendViaMsg91(to, body);
  } catch (err) {
    console.error("SMS send error:", err);
  }
  return false;
}

export function formatJourneySms(params: {
  userName: string;
  status: string;
  destAddress: string;
  etaMinutes: number | null;
  lat: number | null;
  lng: number | null;
  trackUrl: string;
  updatedAt: Date;
}): string {
  const time = params.updatedAt.toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
  const eta = params.etaMinutes != null ? `${params.etaMinutes} min` : "updating";
  const loc =
    params.lat != null && params.lng != null
      ? `${params.lat.toFixed(4)}, ${params.lng.toFixed(4)}`
      : "waiting for GPS";
  return [
    `SafeTrip: ${params.userName}`,
    `Status: ${params.status}`,
    `ETA: ${eta}`,
    `To: ${params.destAddress}`,
    `Location: ${loc}`,
    `Updated: ${time}`,
    `Track: ${params.trackUrl}`,
  ].join("\n");
}

export function shouldSendScheduledSms(lastSmsAt: Date | null, etaMinutes: number | null, now = Date.now()): boolean {
  if (!lastSmsAt) return true;
  return now - lastSmsAt.getTime() >= smsIntervalMs(etaMinutes);
}
