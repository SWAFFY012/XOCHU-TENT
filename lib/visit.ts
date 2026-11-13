// Источник и поведение посетителя в текущем визите: меток объявления (utm, yclid), откуда пришёл,
// сколько страниц открыл и как давно на сайте. Визит, как в Метрике, заканчивается после 30 минут без действий.
// Запись живёт в localStorage, при оформлении заказа корзина отправляет её вместе с заказом.

export const VISIT_KEY = "ht_visit";
const GAP_MS = 30 * 60_000;
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export type VisitRecord = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  yclid?: boolean;
  /** внешний сайт, с которого пришли (только хост) */
  referrer?: string;
  /** страница, на которую пришли */
  landing: string;
  startedAt: number;
  lastAt: number;
  /** последняя открытая страница: защита от двойного вызова (в разработке React запускает эффект дважды) */
  lastPath?: string;
  pages: number;
};

/** Что уходит в заказ: запись визита плюс его длительность на момент отправки. */
export type VisitPayload = Omit<VisitRecord, "startedAt" | "lastAt"> & { seconds: number };

function read(): VisitRecord | null {
  try {
    const raw = window.localStorage.getItem(VISIT_KEY);
    return raw ? (JSON.parse(raw) as VisitRecord) : null;
  } catch {
    return null;
  }
}

function write(rec: VisitRecord) {
  try {
    window.localStorage.setItem(VISIT_KEY, JSON.stringify(rec));
  } catch {
    // приватный режим или переполнение: источник просто не запомним
  }
}

/** Вызывается при каждом открытии страницы: продолжает текущий визит или начинает новый. */
export function trackPageview() {
  try {
    const now = Date.now();
    const q = new URLSearchParams(window.location.search);
    const tags: Partial<Record<(typeof UTM)[number], string>> = {};
    for (const k of UTM) {
      const v = q.get(k);
      if (v) tags[k] = v.slice(0, 200);
    }
    const yclid = q.has("yclid");
    const hasAd = yclid || Object.keys(tags).length > 0;

    const rec = read();
    const alive = rec && now - rec.lastAt < GAP_MS;
    // новый клик по другому объявлению внутри визита тоже начинает новый визит
    const otherAd = hasAd && rec && (rec.utm_content !== tags.utm_content || rec.utm_campaign !== tags.utm_campaign);

    const path = window.location.pathname.slice(0, 200);
    if (alive && !otherAd && rec) {
      if (rec.lastPath === path && now - rec.lastAt < 1000) return;
      write({ ...rec, lastAt: now, lastPath: path, pages: rec.pages + 1 });
      return;
    }

    let referrer: string | undefined;
    try {
      const host = document.referrer ? new URL(document.referrer).hostname : "";
      if (host && host !== window.location.hostname) referrer = host.slice(0, 100);
    } catch {
      // кривой referrer не важен
    }
    write({ ...tags, yclid: yclid || undefined, referrer, landing: path, startedAt: now, lastAt: now, lastPath: path, pages: 1 });
  } catch {
    // аналитика не должна ломать сайт
  }
}

/** Текущий визит для отправки с заказом; null, если ничего не запомнили. */
export function currentVisit(): VisitPayload | null {
  const rec = read();
  if (!rec) return null;
  const { startedAt, lastAt, lastPath, ...rest } = rec;
  void lastAt;
  void lastPath;
  return { ...rest, seconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)) };
}
