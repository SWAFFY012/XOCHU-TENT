import "server-only";
import type { DeliveryProvider } from "./types";

/**
 * Ozon Логистика через Seller API: заказ с сайта уходит в кабинет продавца Ozon.
 * Авторизация Seller API — заголовки Client-Id и Api-Key (ключ создаётся в кабинете:
 * Настройки → Seller API). Ключи только в env: OZON_SELLER_CLIENT_ID, OZON_SELLER_API_KEY.
 */
const BASE = process.env.OZON_SELLER_API_URL || "https://api-seller.ozon.ru";

function headers() {
  return {
    "Client-Id": process.env.OZON_SELLER_CLIENT_ID ?? "",
    "Api-Key": process.env.OZON_SELLER_API_KEY ?? "",
    "Content-Type": "application/json",
  };
}

/** Запрос к Seller API. Метод и тело — по документации docs.ozon.ru/api/seller. */
export async function sellerApi<T>(method: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${method}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Ozon Seller API ${method}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const ozon: DeliveryProvider = {
  id: "ozon",
  ready: () => Boolean(process.env.OZON_SELLER_CLIENT_ID && process.env.OZON_SELLER_API_KEY),
  // TODO: расчёт стоимости доставки Ozon Логистикой. Метод уточнить в документации Seller API
  // или у менеджера Ozon (доставка заказов со своего сайта). Пока считает менеджер.
  calculate: async () => null,
  async createOrder() {
    if (!this.ready()) return null;
    // TODO: создание отправления для заказа с сайта. Нужен метод Seller API для внешних заказов
    // (уточнить у Ozon: в открытой документации его нет); вызвать через sellerApi(method, body).
    return null;
  },
};
