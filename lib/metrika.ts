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
} as const;

export type Goal = (typeof goals)[keyof typeof goals];

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
