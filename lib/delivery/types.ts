import type { DeliveryServiceId } from "@/lib/site";
import type { Order } from "@/lib/orders/types";

/** Что нужно службе для расчёта: откуда, куда и что везём. */
export type DeliveryQuery = {
  city: string;
  address: string;
  /** вес заказа, кг */
  weight: number;
  /** упаковки «Д×Ш×В» в см, по одной на штуку; у своего размера может не быть */
  boxes: string[];
  /** сумма товаров — для объявленной ценности */
  value: number;
};

export type DeliveryQuote = {
  /** стоимость, ₽ */
  cost: number;
  /** срок в днях, «2–4» */
  days?: string;
};

export interface DeliveryProvider {
  id: DeliveryServiceId;
  /** Подключён ли API (заданы ключи). Без него стоимость считает менеджер. */
  ready(): boolean;
  /** Стоимость и срок; null — посчитать автоматически нельзя. */
  calculate(q: DeliveryQuery): Promise<DeliveryQuote | null>;
  /** Создать отправление в кабинете службы после оплаты; возвращает номер заказа у службы. */
  createOrder?(order: Order): Promise<{ carrierOrderId: string; track?: string } | null>;
}
