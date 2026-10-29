import type { DeliveryServiceId } from "@/lib/site";
import type { Order } from "@/lib/orders/types";

/** Грузоместо: одна упакованная штука товара. */
export type Parcel = {
  /** вес, кг */
  weight: number;
  /** габариты упаковки, см, по убыванию: [длина, ширина, высота] */
  dims: [number, number, number];
};

/** «pvz» — до пункта выдачи, терминала или отделения; «door» — курьером до адреса. */
export type DeliveryMode = "pvz" | "door";

/** Что нужно службе для расчёта: куда и что везём. */
export type DeliveryQuery = {
  city: string;
  /** улица и дом — для доставки до двери */
  address: string;
  parcels: Parcel[];
  /** позиции корзины — Ozon считает доставку по своим SKU товаров */
  items?: { slug: string; option: string; color: string; size: string; qty: number; custom: boolean }[];
  /** сумма товаров, ₽ — для объявленной ценности и страховки */
  value: number;
  /** выбранный пункт выдачи */
  pointId?: string;
};

export type DeliveryOption = {
  service: DeliveryServiceId;
  mode: DeliveryMode;
  /** стоимость, ₽; null — посчитает менеджер */
  cost: number | null;
  /** срок в днях в пути, «3–5» */
  days?: string;
  /** код тарифа службы — нужен для создания отправления */
  tariff?: string;
  /** пояснение: «укажите индекс», «крупный груз — уточнит менеджер» и т. п. */
  note?: string;
  /** груз на границе ограничений службы: цена предварительная, условия подтверждает менеджер */
  preliminary?: boolean;
  /** нельзя выбрать: груз не проходит по весу или габаритам */
  unavailable?: boolean;
};

export type DeliveryPoint = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  workTime?: string;
};

export interface DeliveryProvider {
  id: DeliveryServiceId;
  /** Подключён ли API (заданы ключи). Без него стоимость считает менеджер. */
  ready(): boolean;
  /** Варианты доставки (до пункта, до двери) со стоимостью и сроком. */
  calculate(q: DeliveryQuery): Promise<DeliveryOption[]>;
  /** Пункты выдачи в городе, куда пройдёт этот груз. */
  points?(q: { city: string; parcels: Parcel[] }): Promise<DeliveryPoint[]>;
  /** Создать отправление в кабинете службы; возвращает номер заказа у службы. */
  createOrder?(order: Order): Promise<{ carrierOrderId: string; track?: string }>;
  /** Трек-номер созданного отправления, когда служба его присвоила. */
  getTrack?(carrierOrderId: string): Promise<string | null>;
}
