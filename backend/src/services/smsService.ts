import { config } from "../config.ts";
import { smsIntervalMs } from "../lib/smsSchedule.ts";
import { normalizeIndianMobile } from "../lib/phone.ts";

export { formatTripSms, mapsSmsLink } from "../lib/smsMessage.ts";

export type SmsSendResult = {
  configured: boolean;
  provider: "twilio" | "msg91" | "fast2sms" | "none";
  sent: number;
  failed: number;
  errors: string[];
};

function twilioKeysPresent(): boolean {
  return Boolean(config.twilioAccountSid && config.twilioAuthToken && config.twilioFromNumber);
}

export function resolvedSmsProvider(): SmsSendResult["provider"] {
  const named = config.smsProvider;
  if (named === "twilio") return twilioKeysPresent() ? "twilio" : "none";
  if (named === "fast2sms") return config.fast2smsApiKey ? "fast2sms" : "none";
  if (named === "msg91") return config.msg91AuthKey ? "msg91" : "none";
  if (twilioKeysPresent()) return "twilio";
  if (config.fast2smsApiKey) return "fast2sms";
  if (config.msg91AuthKey) return "msg91";
  return "none";
}

export function isSmsConfigured(): boolean {
  return resolvedSmsProvider() !== "none";
}

export function emptySmsResult(partial: Partial<SmsSendResult> = {}): SmsSendResult {
  const provider = resolvedSmsProvider();
  return {
    configured: provider !== "none",
    provider,
    sent: 0,
    failed: 0,
    errors: [],
    ...partial,
  };
}

function tenDigit(e164: string): string {
  return e164.replace(/^\+91/, "").replace(/\D/g, "");
}

function explainTwilioError(status: number, raw: string): string {
  let code = 0;
  let message = raw.slice(0, 240);
  try {
    const parsed = JSON.parse(raw) as { code?: number; message?: string };
    code = parsed.code ?? 0;
    if (parsed.message) message = parsed.message;
  } catch {
    /* use raw */
  }
  if (code === 21608 || code === 21211 || /unverified/i.test(message)) {
    return "Twilio trial can only text numbers you verified in the Twilio console (Phone Numbers → Verified Caller IDs).";
  }
  if (code === 21408 || /permission|not enabled/i.test(message)) {
    return "Enable SMS to India in Twilio Geo Permissions, then try again.";
  }
  if (status === 401 || code === 20003) {
    return "Twilio account SID or auth token is incorrect.";
  }
  return message || `Twilio rejected the SMS (${status}).`;
}

async function sendViaTwilio(toE164: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const sid = config.twilioAccountSid;
  const token = config.twilioAuthToken;
  const from = config.twilioFromNumber;
  if (!sid || !token || !from) return { ok: false, error: "Twilio is not fully configured (SID, token, From number)." };
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
    return { ok: false, error: explainTwilioError(response.status, text) };
  }
  return { ok: true };
}

async function sendViaMsg91(toE164: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const key = config.msg91AuthKey;
  if (!key) return { ok: false, error: "MSG91 auth key missing." };
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
    return quick.ok ? { ok: true } : { ok: false, error: "MSG91 could not send the SMS." };
  }
  return { ok: true };
}

async function sendViaFast2Sms(toE164: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const key = config.fast2smsApiKey;
  if (!key) return { ok: false, error: "Fast2SMS key missing." };
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
    return { ok: false, error: "Fast2SMS rejected the SMS." };
  }
  const data = (await response.json().catch(() => ({}))) as { return?: boolean };
  return data.return === false ? { ok: false, error: "Fast2SMS did not send the SMS." } : { ok: true };
}

export async function sendSms(rawPhone: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const provider = resolvedSmsProvider();
  if (provider === "none") return { ok: false, error: "SMS is not configured on the server." };
  const to = normalizeIndianMobile(rawPhone);
  if (!to) return { ok: false, error: `${rawPhone} is not a valid Indian mobile number.` };
  try {
    if (provider === "twilio") return await sendViaTwilio(to, body);
    if (provider === "msg91") return await sendViaMsg91(to, body);
    if (provider === "fast2sms") return await sendViaFast2Sms(to, body);
  } catch (err) {
    console.error("SMS send error:", err);
    return { ok: false, error: "Could not reach the SMS provider." };
  }
  return { ok: false, error: "Unknown SMS provider." };
}

export async function sendSmsToNumbers(phones: string[], body: string): Promise<SmsSendResult> {
  const provider = resolvedSmsProvider();
  if (provider === "none") {
    return { configured: false, provider, sent: 0, failed: phones.length, errors: ["Add Twilio keys on the API host to send SMS."] };
  }
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const phone of phones) {
    const result = await sendSms(phone, body);
    if (result.ok) sent += 1;
    else {
      failed += 1;
      if (result.error && !errors.includes(result.error)) errors.push(result.error);
    }
  }
  return { configured: true, provider, sent, failed, errors };
}

export function shouldSendScheduledSms(lastSmsAt: Date | null, etaMinutes: number | null, now = Date.now()): boolean {
  if (!lastSmsAt) return true;
  return now - lastSmsAt.getTime() >= smsIntervalMs(etaMinutes);
}
