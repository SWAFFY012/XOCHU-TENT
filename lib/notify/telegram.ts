import "server-only";

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Telegram настроен, если заданы TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID. */
export const telegramReady = () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

/**
 * Сообщение менеджеру в рабочий чат (HTML-разметка Telegram).
 * Без настроек в разработке пишет текст в консоль и считается отправленным.
 */
export async function notifyManager(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[telegram] TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID не заданы. Сообщение:\n" + text);
      return true;
    }
    console.error("[telegram] не настроен");
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("[telegram]", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[telegram]", e);
    return false;
  }
}
