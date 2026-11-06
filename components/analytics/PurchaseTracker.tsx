"use client";

import { useEffect } from "react";
import { goals, pushEcommerce, reachGoal, type EcommerceProduct } from "@/lib/metrika";

/**
 * Отправляет в Метрику покупку, когда заказ оплачен (рендерится на странице «Заказ оплачен»).
 * Защита от повтора: тот же заказ при обновлении страницы второй раз не считаем.
 */
export function PurchaseTracker({ orderId, total, products }: { orderId: string; total: number; products: EcommerceProduct[] }) {
  useEffect(() => {
    const key = `ym-purchase-${orderId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // без sessionStorage лучше отправить дважды, чем потерять покупку
    }
    pushEcommerce("purchase", products, orderId);
    reachGoal(goals.orderPaid, { order_price: total });
  }, [orderId, total, products]);

  return null;
}
