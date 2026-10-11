"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Check } from "lucide-react";
import { PriceTicker } from "@/components/motion/PriceTicker";
import { useCart } from "@/lib/cart";
import { estimateCustom, formatPrice } from "@/lib/format";
import type { ProductSummary } from "@/lib/types";

type Lite = Pick<ProductSummary, "slug" | "title" | "kind" | "colors" | "options" | "pricePerM2ByOption" | "pricePerM2Median">;

/** Калькулятор нестандартного размера на главной */
export function CustomCalc({ products }: { products: Lite[] }) {
  const add = useCart((s) => s.add);
  const [slug, setSlug] = useState(products[0].slug);
  const [w, setW] = useState(3);
  const [l, setL] = useState(4.5);
  const [done, setDone] = useState(false);

  const p = products.find((x) => x.slug === slug)!;
  const perM2 = p.pricePerM2ByOption[p.options[0]] ?? p.pricePerM2Median;
  const area = Math.round(w * l * 100) / 100;
  const price = estimateCustom(area, perM2);
  const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });

  return (
    <div className="glass-panel grid min-h-[65svh] gap-6 rounded-[30px] p-5 text-ink md:grid-cols-[1.15fr_1fr] md:gap-10 md:p-[3vw]">
      <div className="flex flex-col justify-between gap-8 md:gap-12">
        <GlassSelect
          label="Изделие"
          value={slug}
          options={products.map((x) => ({ value: x.slug, label: x.title }))}
          onChange={setSlug}
        />
        <Slider label="Ширина" value={w} min={0.5} max={12} onChange={setW} fmt={fmt} />
        <Slider label="Длина" value={l} min={0.5} max={20} onChange={setL} fmt={fmt} />
      </div>

      <div className="flex flex-col justify-between gap-8 rounded-3xl bg-tarp p-6 text-paper md:p-[3vw]">
        <div>
          <div className="font-display text-[clamp(4.2rem,7vw,9rem)] leading-[0.85] font-black">
            {fmt(w)}×{fmt(l)}
            <span className="ml-1 text-3xl">м</span>
          </div>
          <p className="mt-4 text-lg text-paper/70 md:text-2xl">
            {area.toLocaleString("ru-RU")} м² × {formatPrice(perM2)}
          </p>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <PriceTicker value={price} className="font-display text-[clamp(3.5rem,5vw,6rem)] leading-none font-extrabold text-strap" />
            <span className="rounded-md bg-paper/15 px-1.5 py-0.5 text-xs font-semibold">ориентировочно</span>
          </div>
          <p className="mt-4 text-base text-paper/75 md:text-xl">Точную цену назовёт менеджер: она зависит от крепежа и цвета.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-strap min-h-16 flex-1 text-lg"
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
                });
                setDone(true);
                setTimeout(() => setDone(false), 2500);
              }}
            >
              {done ? (
                <>
                  <Check className="size-5" /> В заявке
                </>
              ) : (
                "Добавить в заявку"
              )}
            </button>
            <Link href={`/catalog/${p.slug}`} scroll={false} className="btn btn-ghost min-h-16 flex-1 text-lg">
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
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between text-xl font-semibold md:text-2xl">
        {label}
        <span className="font-display text-4xl font-extrabold md:text-5xl">{fmt(value)} м</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 w-full accent-[var(--color-tarp)]"
      />
      {/* рулетка под ползунком */}
      <span
        className="h-3 w-full opacity-60"
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
    <div ref={box} className="relative flex flex-col gap-2">
      <span className="text-xl font-semibold md:text-2xl">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="glass flex min-h-16 items-center justify-between gap-3 rounded-2xl px-5 text-left text-lg font-semibold md:min-h-20 md:text-2xl"
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
