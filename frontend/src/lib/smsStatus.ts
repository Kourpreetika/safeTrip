export type SmsResult = {
  configured?: boolean;
  provider?: string;
  sent?: number;
  failed?: number;
  errors?: string[];
};

export function smsNotice(event: string, sms?: SmsResult): { message: string; kind?: "warn" | "err" } {
  const sent = sms?.sent ?? 0;
  const failed = sms?.failed ?? 0;
  const via = sms?.provider === "twilio" ? "Twilio" : "SMS";
  const extra = (sms?.errors ?? []).filter(Boolean).join(" ");
  if (sent > 0 && failed === 0) {
    return { message: `${event} SMS sent to ${sent} trusted contact${sent === 1 ? "" : "s"} via ${via}.` };
  }
  if (sent > 0) {
    return { message: `${event} SMS sent to ${sent}; ${failed} failed. ${extra}`.trim(), kind: "warn" };
  }
  if (sms?.configured && failed === 0) {
    return { message: `${event} No SMS was sent — add a trusted contact with a valid Indian mobile number.`, kind: "warn" };
  }
  if (!sms?.configured) {
    return {
      message: `${event} In-app alerts were sent where possible. Add Twilio trial keys on the API to send SMS.`,
      kind: "warn",
    };
  }
  return {
    message: `${event} SMS did not send. ${extra || "Verify each contact number in the Twilio console (trial accounts can only text Verified Caller IDs)."}`,
    kind: "warn",
  };
}
