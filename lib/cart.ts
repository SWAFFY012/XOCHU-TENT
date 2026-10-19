"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "./types";

type CartState = {
  items: CartItem[];
  /** Последнее добавление: для анимации счётчика в шапке */
  bump: number;
  add: (item: Omit<CartItem, "key" | "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

export const itemKey = (i: Pick<CartItem, "slug" | "option" | "color" | "size" | "custom">) =>
  [i.slug, i.option, i.color, i.size, i.custom ? "custom" : "std"].join("|");

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      bump: 0,
      add: (item, qty = 1) =>
        set((s) => {
          const key = itemKey(item);
          const existing = s.items.find((i) => i.key === key);
          const items = existing
            ? s.items.map((i) => (i.key === key ? { ...i, qty: Math.min(99, i.qty + qty) } : i))
            : [...s.items, { ...item, key, qty }];
          return { items, bump: s.bump + 1 };
        }),
      setQty: (key, qty) =>
        set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(99, qty)) } : i)) })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
    }),
    { name: "hochutent-cart", partialize: (s) => ({ items: s.items }) },
  ),
);

/** До гидрации корзина пустая и на сервере, и на клиенте */
export { useHydrated } from "./hooks";

export const cartCount = (items: CartItem[]) => items.reduce((s, i) => s + i.qty, 0);
export const cartTotal = (items: CartItem[]) => items.reduce((s, i) => s + i.price * i.qty, 0);
/** Общий вес заказа, кг (у старых позиций корзины веса может не быть) */
export const cartWeight = (items: CartItem[]) => Math.round(items.reduce((s, i) => s + (i.weight ?? 0) * i.qty, 0) * 10) / 10;
