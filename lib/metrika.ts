// Яндекс Метрика: ID счётчика и безопасные обёртки для целей и электронной коммерции.
// Пока NEXT_PUBLIC_YM_ID не задан, всё это не делает ничего: ни скрипта, ни запросов.

export const YM_ID = Number(process.env.NEXT_PUBLIC_YM_ID) || 0;

type Ym = (id: number, method: string, ...args: unknown[]) => void;

declare global {
  interface Window {
    ym?: Ym;
    dataLayer?: unknown[];
  }
}

/**
 * Идентификаторы целей. В кабинете Метрики создайте цели типа «JavaScript-событие»
 * с теми же идентификаторами (см. README, раздел «Яндекс Метрика»).
 */
export const goals = {
  addToCart: "add_to_cart", // товар добавлен в корзину
  orderSubmit: "order_submit", // заказ оформлен на сайте (до оплаты)
  leadSubmit: "lead_submit", // отправлена заявка (мягкие окна, свой размер)
  orderPaid: "order_paid", // заказ оплачен
  phoneClick: "phone_click", // клик по телефону
  emailClick: "email_click", // клик по почте
  telegramClick: "telegram_click", // клик по Telegram
  whatsappClick: "whatsapp_click", // клик по WhatsApp
  ozonClick: "ozon_click", // переход в магазин на Ozon
  // Просмотр секций главной (SectionTracker): секция была на экране нужное время
  hero10s: "hero_10s", // 10 секунд на первом экране
  hero30s: "hero_30s", // 30 секунд на первом экране
  viewSeason: "view_season", // блок «Готовы к зиме»
  viewCalc: "view_calc", // калькулятор нестандартного размера
  viewProcess: "view_process", // «Как мы шьём»: этапы производства
  viewCustomSize: "view_custom_size", // «Любой размер за 1–3 дня»
  viewMaterials: "view_materials", // сравнение материалов
  viewFaq: "view_faq", // частые вопросы
  viewCta: "view_cta", // финальный призыв
} as const;

/**
 * Активное время в разделах (PageTimeTracker): пороги в секундах. Идентификатор цели: time_<раздел>_<секунды>s,
 * например time_cart_600s — десять минут в корзине.
 */
export const TIME_STEPS = {
  about: [30, 60, 120, 300],
  catalog: [30, 60, 120, 300, 600, 1200, 1800],
  cart: [30, 60, 120, 300, 600, 1200, 1800],
} as const;
export type TimeSection = keyof typeof TIME_STEPS;
export type TimeGoal = `time_${TimeSection}_${number}s`;

export type Goal = (typeof goals)[keyof typeof goals] | TimeGoal;

export const timeGoal = (section: TimeSection, sec: number) => `time_${section}_${sec}s` as TimeGoal;

/** Отправляет достижение цели. Никогда не бросает исключений: аналитика не должна ломать заказ. */
export function reachGoal(goal: Goal, params?: Record<string, unknown>) {
  if (!YM_ID || typeof window === "undefined" || !window.ym) return;
  try {
    window.ym(YM_ID, "reachGoal", goal, params);
  } catch {
    // блокировщик рекламы или сбой скрипта — пропускаем
  }
}

export type EcommerceProduct = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
};

/** Электронная коммерция: событие добавления в корзину или покупки (контейнер dataLayer). */
export function pushEcommerce(
  kind: "add" | "purchase",
  products: EcommerceProduct[],
  purchaseId?: string,
) {
  if (!YM_ID || typeof window === "undefined") return;
  const body =
    kind === "add"
      ? { add: { products } }
      : { purchase: { actionField: { id: purchaseId }, products } };
  (window.dataLayer ||= []).push({ ecommerce: { currencyCode: "RUB", ...body } });
}
