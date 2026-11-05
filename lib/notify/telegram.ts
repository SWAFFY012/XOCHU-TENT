import "server-only";

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Получатели: TELEGRAM_CHAT_ID — один или несколько чатов через запятую (личные ID менеджеров и/или группа). */
const chatIds = () => (process.env.TELEGRAM_CHAT_ID ?? "").split(/[,;\s]+/).filter(Boolean);

/** Telegram настроен, если заданы TELEGRAM_BOT_TOKEN и хотя бы один TELEGRAM_CHAT_ID. */
export const telegramReady = () => Boolean(process.env.TELEGRAM_BOT_TOKEN && chatIds().length);

/**
 * Сообщение менеджерам во все чаты из TELEGRAM_CHAT_ID (HTML-разметка Telegram). true — дошло хотя бы в один чат.
 * Бот не может писать первым: каждый получатель должен хотя бы раз нажать у бота Start, иначе Telegram вернёт 403.
 * Без настроек в разработке пишет текст в консоль и считается отправленным.
 */
export async function notifyManager(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ids = chatIds();
  if (!token || !ids.length) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[telegram] TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID не заданы. Сообщение:\n" + text);
      return true;
    }
    console.error("[telegram] не настроен");
    return false;
  }
  const results = await Promise.all(
    ids.map(async (chatId) => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) console.error(`[telegram] чат ${chatId}:`, res.status, await res.text());
        return res.ok;
      } catch (e) {
        console.error(`[telegram] чат ${chatId}:`, e);
        return false;
      }
    }),
  );
  return results.some(Boolean);
}
