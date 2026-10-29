import "server-only";

/** Запрос к API службы с таймаутом; ошибка HTTP — исключение с текстом ответа. */
export async function fetchJson<T>(url: string, init: RequestInit & { timeout?: number } = {}): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(init.timeout ?? 12_000), cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

/** Кэш в памяти процесса: одинаковые расчёты и списки пунктов не запрашиваем повторно. */
export function memo<T>(ttlMs: number) {
  const store = new Map<string, { at: number; value: Promise<T> }>();
  return (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = store.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;
    if (store.size > 500) store.clear();
    const value = load();
    store.set(key, { at: Date.now(), value });
    // ошибку не кэшируем
    value.catch(() => store.delete(key));
    return value;
  };
}

/** «3» или «3–5» из минимального и максимального срока. */
export const daysRange = (min?: number, max?: number) =>
  !min && !max ? undefined : !max || min === max ? String(min ?? max) : `${min ?? 1}–${max}`;
