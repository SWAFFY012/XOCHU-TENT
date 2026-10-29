import type { DeliveryServiceId } from "@/lib/site";

/** Жизненный цикл заказа. Заявка менеджеру (kind: "lead") живёт в том же списке. */
export const ORDER_STATUSES = ["new", "paid", "in_production", "ready_for_pickup", "handed_to_carrier", "done", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Новый",
  paid: "Оплачен",
  in_production: "В производстве",
  ready_for_pickup: "Готов к самовывозу",
  handed_to_carrier: "Передан в ТК",
  done: "Выполнен",
  cancelled: "Отменён",
};

export type ContactMethod = "phone" | "telegram" | "whatsapp";

export type OrderItem = {
  slug: string;
  title: string;
  option: string;
  color: string;
  size: string;
  custom: boolean;
  /** свой размер, цену которого подтверждает менеджер: онлайн не оплачивается */
  quote: boolean;
  qty: number;
  /** цена за штуку, пересчитана на сервере */
  price: number;
  /** вес штуки, кг */
  weight: number;
  /** упаковка «Д×Ш×В», см */
  box: string;
};

export type OrderDelivery =
  | { method: "pickup" }
  | {
      method: "carrier";
      service: DeliveryServiceId;
      /** до пункта выдачи (терминала, отделения) или курьером до двери */
      mode: "pvz" | "door";
      city: string;
      /** адрес получателя (для двери) */
      address: string;
      /** выбранный пункт выдачи или терминал */
      point?: { id: string; name: string; address: string };
      /** стоимость доставки, ₽; null — считает менеджер */
      cost: number | null;
      /** срок в пути по расчёту службы, дней */
      days?: string;
      /** код тарифа службы из расчёта */
      tariff?: string;
      /** почему цену уточняет менеджер (крупный груз и т. п.) */
      note?: string;
      /** номер отправления в ТК */
      track?: string;
      /** номер заказа в системе ТК, если создан через API */
      carrierOrderId?: string;
    };

export type PaymentState = {
  provider: "ozonpay";
  /** id платежа у провайдера */
  id?: string;
  status: "none" | "pending" | "paid" | "failed" | "refunded";
  /** ссылка на платёжную форму */
  url?: string;
  paidAt?: string;
  /** обработанные уведомления провайдера — для идемпотентности webhook */
  events: string[];
};

export type Order = {
  /** номер для покупателя, например «1024» */
  id: string;
  kind: "order" | "lead";
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  customer: {
    name: string;
    phone: string;
    email: string;
    contact: ContactMethod;
    telegram: string;
  };
  comment: string;
  items: OrderItem[];
  /** сумма товаров, ₽ */
  itemsTotal: number;
  /** вес заказа, кг */
  weight: number;
  delivery: OrderDelivery;
  /** к оплате онлайн, ₽: товары (+ доставка, если оплачивается вместе с заказом) */
  total: number;
  payment: PaymentState;
  /** сделка в Битрикс24, созданная по заказу */
  crm?: { bitrixDealId?: number; bitrixError?: string };
  /** согласие с офертой и обработкой ПД — когда и с какого IP */
  consent: { offer: boolean; personalData: boolean; at: string; ip: string };
  history: { at: string; status: OrderStatus; note?: string }[];
};
