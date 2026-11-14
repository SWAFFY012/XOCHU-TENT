"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type RefObject } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { PriceTicker } from "@/components/motion/PriceTicker";
import type { BuyState } from "./Configurator";

type Props = {
  buy: BuyState | null;
  onAdd: () => void;
  /** Цена под названием: пока она на экране, панель не нужна */
  summaryRef: RefObject<HTMLElement | null>;
  /** Основная кнопка «В корзину»: пока она на экране, панель не нужна */
  buyRef: RefObject<HTMLElement | null>;
};

/**
 * Нижняя панель на телефоне (до 768 px): цена выбранной конфигурации и «В корзину».
 * Появляется, когда цена под названием и основная кнопка ушли с экрана.
 * Для ассистента на body ставятся метки: data-buybar — панель видна, ассистент поднимается над ней;
 * data-buyzone — на экране цена под названием или основная кнопка: ассистент прячется, чтобы их не закрывать.
 */
export function StickyBuyBar({ buy, onAdd, summaryRef, buyRef }: Props) {
  const [summaryIn, setSummaryIn] = useState(true);
  const [buyIn, setBuyIn] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const summary = summaryRef.current;
    const button = buyRef.current;
    if (!summary || !button) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === summary) setSummaryIn(e.isIntersecting);
        if (e.target === button) setBuyIn(e.isIntersecting);
      }
    });
    io.observe(summary);
    io.observe(button);
    return () => io.disconnect();
  }, [summaryRef, buyRef]);

  const visible = !summaryIn && !buyIn && !!buy;
  useBodyFlag("buybar", visible);
  useBodyFlag("buyzone", buyIn || summaryIn);

  return (
    <AnimatePresence>
      {visible && buy && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-[25] border-t border-line bg-paper/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-14px_32px_-20px_rgb(22_27_21/0.45)] backdrop-blur md:hidden"
        >
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 shrink-0">
              <PriceTicker value={buy.total} className="block font-display text-[1.9rem] leading-none font-extrabold" />
              <span className="mt-1 block truncate text-xs text-ink-soft">{buy.label}</span>
            </div>
            <button
              type="button"
              onClick={onAdd}
              disabled={buy.disabled}
              className="btn btn-strap min-h-12 flex-1 rounded-2xl text-base disabled:cursor-not-allowed disabled:opacity-50"
            >
              {buy.added ? <Check className="size-5" aria-hidden /> : <ShoppingBag className="size-5" aria-hidden />}
              {buy.added ? (buy.quote ? "В заявке" : "В корзине") : buy.quote ? "В заявку" : "В корзину"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function useBodyFlag(name: string, on: boolean) {
  useEffect(() => {
    if (!on) return;
    document.body.dataset[name] = "";
    return () => {
      delete document.body.dataset[name];
    };
  }, [name, on]);
}
