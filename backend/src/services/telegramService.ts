import { config } from "../config.ts";
import { prisma } from "../lib/prisma.ts";
import { normalizeIndianMobile } from "../lib/phone.ts";

export type AlertSendResult = {
  configured: boolean;
  provider: "telegram" | "none";
  sent: number;
  failed: number;
  errors: string[];
};

export function isTelegramConfigured(): boolean {
  return Boolean(config.telegramBotToken);
}

export function emptyAlertResult(partial: Partial<AlertSendResult> = {}): AlertSendResult {
  const configured = isTelegramConfigured();
  return {
    configured,
    provider: configured ? "telegram" : "none",
    sent: 0,
    failed: 0,
    errors: [],
    ...partial,
  };
}

export function telegramBotUrl(): string {
  return `https://t.me/${config.telegramBotUsername}`;
}

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${config.telegramBotToken}/${method}`;
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!isTelegramConfigured()) return { ok: false, error: "Telegram bot token is missing." };
  const response = await fetch(apiUrl("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const data = (await response.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!response.ok || !data.ok) {
    const error = data.description || `Telegram rejected the message (${response.status}).`;
    console.error("Telegram send failed:", error);
    return { ok: false, error };
  }
  return { ok: true };
}

export async function sendTelegramToContacts(
  contacts: Array<{ contact: { phone: string; telegramChatId?: string | null } }>,
  text: string,
): Promise<AlertSendResult> {
  const phones = [...new Set(contacts.map((row) => row.contact.phone).filter(Boolean))];
  const linked =
    phones.length === 0
      ? []
      : await prisma.trustedContact.findMany({
          where: { phone: { in: phones }, telegramChatId: { not: null } },
          select: { telegramChatId: true },
        });
  const chats = [
    ...new Set(
      [
        ...contacts.map((row) => row.contact.telegramChatId),
        ...linked.map((row) => row.telegramChatId),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];
  if (!isTelegramConfigured()) {
    return emptyAlertResult({
      configured: false,
      provider: "none",
      failed: contacts.length,
      errors: ["Add TELEGRAM_BOT_TOKEN on the API."],
    });
  }
  if (chats.length === 0) {
    return {
      configured: true,
      provider: "telegram",
      sent: 0,
      failed: contacts.length,
      errors: [
        `Contacts must open ${telegramBotUrl()}, tap Start, and send the same 10-digit mobile saved in SafeTrip.`,
      ],
    };
  }
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const chatId of chats) {
    const result = await sendTelegramMessage(chatId, text);
    if (result.ok) sent += 1;
    else {
      failed += 1;
      if (result.error && !errors.includes(result.error)) errors.push(result.error);
    }
  }
  return { configured: true, provider: "telegram", sent, failed, errors };
}

export async function handleTelegramText(chatId: string, rawText: string): Promise<string> {
  let text = rawText.trim();
  const start = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  if (start && !start[1]) {
    return [
      "SafeTrip alerts",
      "Send your 10-digit Indian mobile number (the same one saved as a trusted contact).",
      "Example: 9103714313",
    ].join("\n");
  }
  if (start?.[1]) text = start[1].trim();
  if (text.startsWith("/")) {
    return "Send your 10-digit Indian mobile number to receive SOS and journey alerts.";
  }
  const phone = normalizeIndianMobile(text);
  if (!phone) {
    return "That is not a valid Indian mobile number. Send 10 digits starting with 6–9 (for example 9103714313).";
  }
  const matches = await prisma.trustedContact.findMany({ where: { phone } });
  if (matches.length === 0) {
    const account = await prisma.user.findFirst({ where: { phone }, select: { id: true } });
    if (account) {
      return "This number is a SafeTrip login. Add it as a trusted contact on the traveller's account, then send it here again for SOS alerts.";
    }
    return `No trusted contact uses ${phone}. Add this number on Contacts, then send it here again.`;
  }
  await prisma.trustedContact.updateMany({
    where: { phone },
    data: { telegramChatId: String(chatId) },
  });
  const names = [...new Set(matches.map((c) => c.name))].join(", ");
  return `Linked. You will get SafeTrip alerts for ${names}.`;
}
