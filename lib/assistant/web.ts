import "server-only";

/**
 * Поиск общей информации о материалах для ассистента: русская Википедия (бесплатно, без ключа, доступна с российского хостинга).
 * Модель получает выдержку и ссылку и может отправить человека читать дальше.
 */
type Hit = { title: string; summary: string; url: string };

export async function webLookup(query: string): Promise<{ results: Hit[] } | { error: string }> {
  const q = query.replace(/\s+/g, " ").trim().slice(0, 100);
  if (!q) return { error: "пустой запрос" };
  const url =
    "https://ru.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: q,
      gsrlimit: "3",
      prop: "extracts|info",
      exintro: "1",
      explaintext: "1",
      exchars: "500",
      inprop: "url",
      redirects: "1",
      format: "json",
      utf8: "1",
    });
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "xochu-tent-assistant/1.0 (xochu.tent@mail.ru)" } });
    if (!res.ok) return { error: `Википедия ответила ${res.status}` };
    const data = (await res.json()) as { query?: { pages?: Record<string, { index: number; title: string; extract?: string; fullurl: string }> } };
    const results = Object.values(data.query?.pages ?? {})
      .sort((a, b) => a.index - b.index)
      // страницы-«значения» только путают модель
      .filter((p) => !/\(значения\)$/.test(p.title) && p.extract)
      .map((p): Hit => ({ title: p.title, summary: p.extract!.replace(/\s+/g, " ").trim(), url: p.fullurl }));
    return results.length ? { results } : { error: "ничего не найдено" };
  } catch {
    return { error: "поиск сейчас недоступен" };
  }
}

/** Описание функции для GigaChat (массив `functions`). */
export const webLookupFunction = {
  name: "web_lookup",
  description:
    "Ищет в русской Википедии статью о материале, ткани, пропитке или термине и возвращает краткую выдержку и ссылку. Вызывай, когда нужен внешний источник по общему вопросу о материалах, а не о товарах магазина.",
  parameters: {
    type: "object",
    properties: { query: { type: "string", description: "Поисковый запрос одним-двумя словами, например «брезент» или «ткань Оксфорд»" } },
    required: ["query"],
  },
  few_shot_examples: [
    { request: "Что такое брезент? Где почитать подробнее?", params: { query: "брезент" } },
    { request: "Дай ссылку про ткань оксфорд", params: { query: "ткань оксфорд" } },
  ],
};
