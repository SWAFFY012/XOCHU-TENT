"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { formatPrice } from "@/lib/format";

/** Цена, которая «докручивается» до нового значения */
export function PriceTicker({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce || prev.current === value) {
      el.textContent = formatPrice(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.45,
      ease: [0.25, 1, 0.5, 1],
      onUpdate: (v) => (el.textContent = formatPrice(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span ref={ref} className={className} aria-live="polite">
      {formatPrice(value)}
    </span>
  );
}
