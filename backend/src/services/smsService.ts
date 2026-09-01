import { config } from "../config.ts";
import { smsIntervalMs } from "../lib/smsSchedule.ts";
import { normalizeIndianMobile } from "../lib/phone.ts";

export { formatTripSms, mapsSmsLink } from "../lib/smsMessage.ts";

export type SmsSendResult = {
  configured: boolean;
  sent: number;
  failed: number;
};

export function resolvedSmsProvider(): "twilio" | "msg91" | "fast2sms" | "none" {
  const named = config.smsProvider;
  if (named === "twilio" || named === "msg91" || named === "fast2sms") return named;
  if (config.fast2smsApiKey) return "fast2sms";
  if (config.twilioAccountSid && config.twilioAuthToken && config.twilioFromNumber) return "twilio";
  if (config.msg91AuthKey) return "msg91";
  return "none";
}

export function isSmsConfigured(): boolean {
  return resolvedSmsProvider() !== "none";
}

function tenDigit(e164: string): string {
  return e164.replace(/^\+91/, "").replace(/\D/g, "");
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
    console.error("Twilio SMS failed:", response.status, await response.text());
    return false;
  }
  return true;
}

async function sendViaMsg91(toE164: string, body: string): Promise<boolean> {
  const key = config.msg91AuthKey;
  if (!key) return false;
  const mobile = tenDigit(toE164);
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
      recipients: [{ mobiles: `91${mobile}`, VAR1: body }],
    }),
  });
  if (!response.ok) {
    const quick = await fetch(
      `https://api.msg91.com/api/sendhttp.php?authkey=${encodeURIComponent(key)}&mobiles=${mobile}&message=${encodeURIComponent(body)}&sender=${encodeURIComponent(config.msg91SenderId)}&route=4&country=91`,
    );
    return quick.ok;
  }
  return true;
}

async function sendViaFast2Sms(toE164: string, body: string): Promise<boolean> {
  const key = config.fast2smsApiKey;
  if (!key) return false;
  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      route: "q",
      message: body,
      language: "english",
      flash: 0,
      numbers: tenDigit(toE164),
    }),
  });
  if (!response.ok) {
    console.error("Fast2SMS failed:", response.status, await response.text());
    return false;
  }
  const data = (await response.json().catch(() => ({}))) as { return?: boolean };
  return data.return !== false;
}

export async function sendSms(rawPhone: string, body: string): Promise<boolean> {
  const provider = resolvedSmsProvider();
  if (provider === "none") return false;
  const to = normalizeIndianMobile(rawPhone);
  if (!to) return false;
  try {
    if (provider === "twilio") return await sendViaTwilio(to, body);
    if (provider === "msg91") return await sendViaMsg91(to, body);
    if (provider === "fast2sms") return await sendViaFast2Sms(to, body);
  } catch (err) {
    console.error("SMS send error:", err);
  }
  return false;
}

export async function sendSmsToNumbers(phones: string[], body: string): Promise<SmsSendResult> {
  if (!isSmsConfigured()) {
    return { configured: false, sent: 0, failed: phones.length };
  }
  let sent = 0;
  let failed = 0;
  for (const phone of phones) {
    if (await sendSms(phone, body)) sent += 1;
    else failed += 1;
  }
  return { configured: true, sent, failed };
}

export function shouldSendScheduledSms(lastSmsAt: Date | null, etaMinutes: number | null, now = Date.now()): boolean {
  if (!lastSmsAt) return true;
  return now - lastSmsAt.getTime() >= smsIntervalMs(etaMinutes);
}

