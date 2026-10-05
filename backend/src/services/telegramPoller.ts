import { config } from "../config.ts";
import { handleTelegramText, isTelegramConfigured, sendTelegramMessage } from "./telegramService.ts";

type TelegramUpdate = {
  update_id: number;
  message?: { chat?: { id?: number }; text?: string };
};

let offset = 0;
let stopped = false;
let timer: ReturnType<typeof setTimeout> | null = null;

async function pollOnce(): Promise<void> {
  const url = `https://api.telegram.org/bot${config.telegramBotToken}/getUpdates?timeout=25&offset=${offset}`;
  const response = await fetch(url);
  const data = (await response.json().catch(() => ({}))) as { ok?: boolean; result?: TelegramUpdate[]; description?: string };
  if (!data.ok || !Array.isArray(data.result)) {
    if (data.description) console.error("Telegram getUpdates:", data.description);
    return;
  }
  for (const update of data.result) {
    offset = update.update_id + 1;
    const chatId = update.message?.chat?.id;
    const text = update.message?.text;
    if (chatId == null || !text) continue;
    try {
      const reply = await handleTelegramText(String(chatId), text);
      await sendTelegramMessage(String(chatId), reply);
    } catch (err) {
      console.error("Telegram update failed:", err);
    }
  }
}

async function loop(): Promise<void> {
  while (!stopped) {
    try {
      await pollOnce();
    } catch (err) {
      console.error("Telegram poll error:", err);
      await new Promise((resolve) => {
        timer = setTimeout(resolve, 4000);
      });
    }
  }
}

export function startTelegramPolling(): void {
  if (!isTelegramConfigured()) {
    console.log("Telegram bot not configured — SOS will not send Telegram messages.");
    return;
  }
  stopped = false;
  console.log(`Telegram bot polling @${config.telegramBotUsername}`);
  void loop();
}

export function stopTelegramPolling(): void {
  stopped = true;
  if (timer) clearTimeout(timer);
}
