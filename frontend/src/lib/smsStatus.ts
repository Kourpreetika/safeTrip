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
  const extra = (sms?.errors ?? []).filter(Boolean).join(" ");
  if (sent > 0 && failed === 0) {
    return { message: `${event} Telegram sent to ${sent} trusted contact${sent === 1 ? "" : "s"}.` };
  }
  if (sent > 0) {
    return { message: `${event} Telegram sent to ${sent}; ${failed} failed. ${extra}`.trim(), kind: "warn" };
  }
  if (sms?.configured && failed === 0) {
    return {
      message: `${event} No Telegram chat is linked yet. Contacts must open @SafeTripAlertBot, tap Start, and send their mobile number.`,
      kind: "warn",
    };
  }
  if (!sms?.configured) {
    return { message: `${event} In-app alerts were sent. Telegram is not configured.`, kind: "warn" };
  }
  return {
    message: `${event} Telegram did not send. ${extra || "Ask contacts to message @SafeTripAlertBot with their mobile number."}`,
    kind: "warn",
  };
}
