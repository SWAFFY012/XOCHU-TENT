import "server-only";

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Получатели: TELEGRAM_CHAT_ID — один или несколько чатов через запятую (личные ID менеджеров и/или группа). */
const chatIds = () => (process.env.TELEGRAM_CHAT_ID ?? "").split(/[,;\s]+/).filter(Boolean);

/** Telegram настроен, если заданы TELEGRAM_BOT_TOKEN и хотя бы один TELEGRAM_CHAT_ID. */
export const telegramReady = () => Boolean(process.env.TELEGRAM_BOT_TOKEN && chatIds().length);

export type TelegramResult = { chat: string; ok: boolean; detail: string };

/** Ответ или ошибка по одному чату, без токена (он попадает в адрес запроса и в тексты ошибок сети). */
const clean = (s: string) => s.split(process.env.TELEGRAM_BOT_TOKEN ?? "\0").join("***");

/**
 * Отправляет текст во все чаты из TELEGRAM_CHAT_ID (HTML-разметка Telegram) и возвращает результат по каждому:
 * чат (последние цифры ID), дошло ли, а если нет — код и причина от Telegram или ошибка сети.
 * Бот не может писать первым: получатель должен хотя бы раз нажать у бота Start, иначе Telegram отвечает 403.
 */
export async function sendToTelegram(text: string): Promise<TelegramResult[]> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return Promise.all(
    chatIds().map(async (chatId): Promise<TelegramResult> => {
      const chat = "…" + chatId.slice(-3);
      if (!token) return { chat, ok: false, detail: "нет TELEGRAM_BOT_TOKEN" };
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) return { chat, ok: true, detail: "доставлено" };
        const body = (await res.json().catch(() => null)) as { description?: string } | null;
        return { chat, ok: false, detail: clean(`${res.status}: ${body?.description ?? "ответ без описания"}`) };
      } catch (e) {
        const cause = e instanceof Error && e.cause instanceof Error ? ` (${(e.cause as NodeJS.ErrnoException).code ?? e.cause.message})` : "";
        return { chat, ok: false, detail: clean(`нет связи с Telegram: ${e instanceof Error ? e.message : e}${cause}`) };
      }
    }),
  );
}

/**
 * Сообщение менеджерам во все чаты из TELEGRAM_CHAT_ID. true — дошло хотя бы в один чат.
 * Без настроек в разработке пишет текст в консоль и считается отправленным.
 */
export async function notifyManager(text: string): Promise<boolean> {
  if (!telegramReady()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[telegram] TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID не заданы. Сообщение:\n" + text);
      return true;
    }
    console.error("[telegram] не настроен");
    return false;
  }
  const results = await sendToTelegram(text);
  for (const r of results) if (!r.ok) console.error(`[telegram] чат ${r.chat}: ${r.detail}`);
  return results.some((r) => r.ok);
}
