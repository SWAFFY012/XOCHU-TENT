"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Check } from "lucide-react";
import { PriceTicker } from "@/components/motion/PriceTicker";
import { useCart } from "@/lib/cart";
import { priceCustom, estimateWeight, formatPrice } from "@/lib/format";
import { isQuoteOnly, sizePricePerM2 } from "@/lib/site";
import type { ProductSummary } from "@/lib/types";

type Lite = Pick<ProductSummary, "slug" | "title" | "kind" | "colors" | "options" | "pricePerM2ByOption" | "pricePerM2Median" | "kgPerM2">;

/** Калькулятор нестандартного размера на главной. На телефоне компактный — целиком в один экран. */
export function CustomCalc({ products }: { products: Lite[] }) {
  const add = useCart((s) => s.add);
  const [slug, setSlug] = useState(products[0].slug);
  const [w, setW] = useState(3);
  const [l, setL] = useState(4.5);
  const [done, setDone] = useState(false);

  const p = products.find((x) => x.slug === slug)!;
  const area = Math.round(w * l * 100) / 100;
  const perM2 = sizePricePerM2(p.slug, p.pricePerM2ByOption[p.options[0]] ?? p.pricePerM2Median, area, true);
  const price = priceCustom(area, perM2);
  const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });

  return (
    <div className="glass-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[26px] p-4 text-ink md:min-h-[65svh] md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-10 md:rounded-[30px] md:p-[3vw]">
      <div className="flex flex-col justify-between gap-3 md:gap-12 [@media(max-height:700px)]:gap-1">
        <GlassSelect
          label="Изделие"
          value={slug}
          options={products.map((x) => ({ value: x.slug, label: x.title }))}
          onChange={setSlug}
        />
        <Slider label="Ширина" value={w} min={0.5} max={12} onChange={setW} fmt={fmt} />
        <Slider label="Длина" value={l} min={0.5} max={20} onChange={setL} fmt={fmt} />
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-[20px] bg-tarp p-4 text-paper md:gap-8 md:rounded-3xl md:p-[3vw]">
        <div>
          <div className="font-display text-[3rem] leading-[0.85] font-black md:text-[clamp(4.2rem,7vw,9rem)]">
            {fmt(w)}×{fmt(l)}
            <span className="ml-1 text-2xl md:text-3xl">м</span>
          </div>
          <p className="mt-2 text-base text-paper/70 md:mt-4 md:text-2xl">
            {area.toLocaleString("ru-RU")} м² × {formatPrice(perM2)}
          </p>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <PriceTicker value={price} className="font-display text-[2.8rem] leading-none font-extrabold text-strap md:text-[clamp(3.5rem,5vw,6rem)]" />
            {isQuoteOnly(p.slug, true) && <span className="rounded-md bg-paper/15 px-1.5 py-0.5 text-xs font-semibold">цену подтвердит менеджер</span>}
          </div>
          <p className="mt-2 text-sm text-paper/75 md:mt-4 md:text-xl [@media(max-height:700px)]:hidden">
            {isQuoteOnly(p.slug, true) ? "Цена предварительная: итоговую назовёт менеджер по заявке." : "Цена итоговая: по площади изделия."} Шьём за 1–3 рабочих дня.
          </p>
          <div className="mt-3 flex gap-2 md:mt-4 md:flex-wrap">
            <button
              type="button"
              className="btn btn-strap min-h-12 flex-1 px-3 text-base md:min-h-16 md:text-lg"
              onClick={() => {
                add({
                  slug: p.slug,
                  title: p.title,
                  kind: p.kind,
                  option: p.options[0],
                  color: p.colors[0],
                  size: `${fmt(w)}х${fmt(l)}`,
                  area,
                  price,
                  custom: true,
                  quote: isQuoteOnly(p.slug, true),
                  weight: estimateWeight(area, p.kgPerM2),
                });
                setDone(true);
                setTimeout(() => setDone(false), 2500);
              }}
            >
              {done ? (
                <>
                  <Check className="size-5" /> {isQuoteOnly(p.slug, true) ? "В заявке" : "В корзине"}
                </>
              ) : (
                <>
                  <span className="md:hidden">{isQuoteOnly(p.slug, true) ? "В заявку" : "В корзину"}</span>
                  <span className="hidden md:inline">{isQuoteOnly(p.slug, true) ? "Добавить в заявку" : "Добавить в корзину"}</span>
                </>
              )}
            </button>
            <Link href={`/catalog/${p.slug}`} scroll={false} className="btn btn-ghost min-h-12 flex-1 px-3 text-base md:min-h-16 md:text-lg">
              Выбрать цвет
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  fmt: (n: number) => string;
}) {
  return (
    <label className="flex flex-col gap-1 md:gap-2">
      <span className="flex items-baseline justify-between text-lg font-semibold md:text-2xl">
        {label}
        <span className="font-display text-3xl font-extrabold md:text-5xl">{fmt(value)} м</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-full accent-[var(--color-tarp)] md:h-10"
      />
      {/* рулетка под ползунком */}
      <span
        className="h-3 w-full opacity-60 [@media(max-height:700px)]:hidden"
        aria-hidden
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--color-ink) 0 1px, transparent 1px 10px), repeating-linear-gradient(90deg, var(--color-ink) 0 1.5px, transparent 1.5px 50px)",
          backgroundSize: "100% 6px, 100% 12px",
          backgroundRepeat: "no-repeat",
        }}
      />
    </label>
  );
}

/** Выпадающий список «матовое стекло» вместо системного select */
function GlassSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative flex flex-col gap-1.5 md:gap-2">
      <span className="text-lg font-semibold md:text-2xl">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="glass flex min-h-12 items-center justify-between gap-3 rounded-2xl px-4 text-left text-base font-semibold md:min-h-20 md:px-5 md:text-2xl"
      >
        {current?.label}
        <ChevronDown className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            data-lenis-prevent
            className="glass-strong absolute top-full right-0 left-0 z-20 mt-2 max-h-80 overflow-auto rounded-2xl p-1.5"
          >
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-left transition-colors ${o.value === value ? "bg-tarp text-paper" : "hover:bg-white/60"}`}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
