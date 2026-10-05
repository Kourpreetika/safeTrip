import { config } from "../config.ts";
import { handleTelegramText, isTelegramConfigured, sendTelegramMessage } from "./telegramService.ts";

type TelegramUpdate = {
  update_id: number;
  message?: { chat?: { id?: number }; text?: string };
};

let offset = 0;
let abort: AbortController | null = null;
let loopPromise: Promise<void> | null = null;

async function sleep(ms: number, signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}

async function pollOnce(signal: AbortSignal): Promise<"ok" | "conflict" | "empty"> {
  const url = `https://api.telegram.org/bot${config.telegramBotToken}/getUpdates?timeout=25&offset=${offset}`;
  const response = await fetch(url, { signal });
  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: TelegramUpdate[];
    description?: string;
    error_code?: number;
  };
  if (data.error_code === 409 || /terminated by other getUpdates/i.test(data.description ?? "")) {
    return "conflict";
  }
  if (!data.ok || !Array.isArray(data.result)) {
    if (data.description) console.error("Telegram getUpdates:", data.description);
    return "empty";
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
  return "ok";
}

async function loop(signal: AbortSignal): Promise<void> {
  while (!signal.aborted) {
    try {
      const status = await pollOnce(signal);
      if (status === "conflict") {
        console.warn("Telegram: another poller was running; retrying in 3s.");
        await sleep(3000, signal);
      }
    } catch (err) {
      if (signal.aborted) return;
      console.error("Telegram poll error:", err);
      await sleep(4000, signal);
    }
  }
}

export function startTelegramPolling(): void {
  stopTelegramPolling();
  if (!isTelegramConfigured()) {
    console.log("Telegram bot not configured — SOS will not send Telegram messages.");
    return;
  }
  abort = new AbortController();
  console.log(`Telegram bot polling @${config.telegramBotUsername}`);
  loopPromise = loop(abort.signal);
}

export function stopTelegramPolling(): void {
  abort?.abort();
  abort = null;
  loopPromise = null;
}
