"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Package, Plus, Ruler, ShoppingBag } from "lucide-react";
import { clsx } from "clsx";
import { PriceTicker } from "@/components/motion/PriceTicker";
import { useCart } from "@/lib/cart";
import { hexOf } from "@/lib/colors";
import { estimateCustom, estimateWeight, formatArea, formatPrice, formatWeight, parseSize } from "@/lib/format";
import { sizeLabels } from "@/lib/content";
import type { CompactVariants, ProductSummary } from "@/lib/types";

export type Selection = { option: string; size: string; custom: boolean };

type Props = {
  p: ProductSummary;
  data: CompactVariants;
  color: number;
  onColor: (i: number) => void;
  /** Сообщает выбор наверх, чтобы сменить фото под пропитку и размер */
  onSelect?: (s: Selection) => void;
  /** Текущее фото — сохраняется в заявке */
  image?: string;
};

const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

export function Configurator({ p, data, color, onColor, onSelect, image }: Props) {
  const add = useCart((s) => s.add);
  const [firstLabel, secondLabel] = sizeLabels[p.slug] ?? ["Ширина", "Длина"];
  const [option, setOption] = useState(0);
  const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState(false);
  const [cw, setCw] = useState("");
  const [cl, setCl] = useState("");
  const [added, setAdded] = useState(false);

  // Ткани на отрез: вторая величина (ширина рулона) у всех размеров одна
  const dims = useMemo(() => data.sizes.map(parseSize), [data.sizes]);
  const rollWidth = useMemo(() => {
    const s = new Set(dims.map((d) => d[1]));
    return p.category === "fabric" && s.size === 1 ? [...s][0] : null;
  }, [dims, p.category]);

  // Варианты текущих пропитки и цвета: sizeIdx -> цена, вес и упаковка
  const rowBySize = useMemo(() => {
    const m = new Map<number, CompactVariants["rows"][number]>();
    for (const r of data.rows) if (r[0] === option && r[1] === color) m.set(r[2], r);
    return m;
  }, [data.rows, option, color]);
  const priceBySize = useMemo(() => new Map([...rowBySize].map(([s, r]) => [s, r[3]])), [rowBySize]);

  const available = useMemo(() => [...priceBySize.keys()].sort((a, b) => a - b), [priceBySize]);
  const widths = useMemo(() => [...new Set(available.map((s) => dims[s][0]))].sort((a, b) => a - b), [available, dims]);

  // Стартовый размер: ближайший к 3 × 4 м (у тканей — первый отрез)
  const [sizeIdx, setSizeIdx] = useState<number>(() => {
    const rows = data.rows.filter(([o, c]) => o === 0 && c === color);
    if (!rows.length) return 0;
    if (p.category === "fabric") return rows[0][2];
    const exact = rows.find((r) => data.sizes[r[2]] === "3х4");
    if (exact) return exact[2];
    return rows.reduce((b, r) => (Math.abs(data.areas[r[2]] - 12) < Math.abs(data.areas[b[2]] - 12) ? r : b))[2];
  });

  // Если размера нет в новой комбинации — берём ближайший по площади
  const current = priceBySize.has(sizeIdx)
    ? sizeIdx
    : available.reduce((best, s) => (Math.abs(data.areas[s] - data.areas[sizeIdx]) < Math.abs(data.areas[best] - data.areas[sizeIdx]) ? s : best), available[0] ?? 0);

  const [curW, curL] = dims[current] ?? [0, 0];
  const lengths = available.filter((s) => dims[s][0] === curW);

  const pickWidth = (w: number) => {
    const opts = available.filter((s) => dims[s][0] === w);
    const best = opts.reduce((b, s) => (Math.abs(dims[s][1] - curL) < Math.abs(dims[b][1] - curL) ? s : b), opts[0]);
    setSizeIdx(best);
  };

  useEffect(() => {
    onSelect?.({ option: p.options[option], size: data.sizes[current], custom });
  }, [onSelect, p.options, option, data.sizes, current, custom]);

  const perM2 = p.pricePerM2ByOption[p.options[option]] ?? p.pricePerM2Median;
  const w = Number(cw.replace(",", "."));
  const l = Number(cl.replace(",", "."));
  const customValid = w >= 0.5 && l >= 0.5 && w <= 30 && l <= 50;
  const customArea = customValid ? Math.round(w * l * 100) / 100 : 0;
  const customPrice = customValid ? estimateCustom(customArea, perM2) : 0;

  const unitPrice = custom ? customPrice : (priceBySize.get(current) ?? 0);
  const row = rowBySize.get(current);
  // Вес и упаковка: из прайса, у своего размера — оценка по весу 1 м²
  const unitWeight = custom ? (customValid ? estimateWeight(customArea, p.kgPerM2) : 0) : (row?.[4] ?? 0);
  const box = !custom && row ? data.boxes[row[5]] : undefined;
  const total = unitPrice * qty;

  const handleAdd = () => {
    if (custom && !customValid) return;
    const size = custom ? `${fmt(w)}х${fmt(l)}` : data.sizes[current];
    add(
      {
        slug: p.slug,
        title: p.title,
        kind: p.kind,
        option: p.options[option],
        color: p.colors[color],
        size,
        area: custom ? customArea : data.areas[current],
        price: unitPrice,
        custom,
        image,
        weight: unitWeight || undefined,
        box,
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2600);
  };

  return (
    <div className="flex flex-col gap-6">
      {p.optionLabel && p.options.length > 1 && (
        <Group label={p.optionLabel}>
          <div className="flex flex-wrap gap-2">
            {p.options.map((o, i) => (
              <Chip key={o} active={i === option} onClick={() => setOption(i)}>
                {o}
              </Chip>
            ))}
          </div>
        </Group>
      )}

      <Group label="Цвет" value={p.colors[color]}>
        <div className="flex flex-wrap gap-2.5">
          {p.colors.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => onColor(i)}
              aria-label={c}
              aria-pressed={i === color}
              className={clsx(
                "relative size-11 rounded-full ring-1 ring-black/15 transition-transform active:scale-95",
                i === color && "ring-0 outline-[2.5px] outline-offset-[3px] outline-ink outline-solid",
              )}
              style={{ background: hexOf(c) }}
            >
              {i === color && (
                <Check
                  className={clsx("absolute inset-0 m-auto size-4", ["Бежевый", "Белый"].includes(c) ? "text-ink" : "text-white")}
                  aria-hidden
                />
              )}
            </button>
          ))}
        </div>
      </Group>

      {/* стандартный / свой размер */}
      <div className="grid grid-cols-2 rounded-full bg-ink/6 p-1 text-[0.95rem] font-semibold">
        {[false, true].map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => setCustom(v)}
            className="relative min-h-11 rounded-full"
            aria-pressed={custom === v}
          >
            {custom === v && (
              <motion.span layoutId={`mode-${p.slug}`} className="absolute inset-0 rounded-full bg-paper shadow-sm" />
            )}
            <span className="relative">{v ? "Свой размер" : "Из таблицы"}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!custom ? (
          <motion.div
            key="std"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-5"
          >
            {rollWidth ? (
              <Group label="Длина отреза" value={`ширина рулона ${fmt(rollWidth)} м`}>
                <ChipScroller>
                  {available.map((s) => (
                    <Chip key={s} active={s === current} onClick={() => setSizeIdx(s)}>
                      {fmt(dims[s][0])} м
                    </Chip>
                  ))}
                </ChipScroller>
              </Group>
            ) : (
              <>
                <Group label={`${firstLabel}, м`}>
                  <ChipScroller>
                    {widths.map((wd) => (
                      <Chip key={wd} active={wd === curW} onClick={() => pickWidth(wd)}>
                        {fmt(wd)}
                      </Chip>
                    ))}
                  </ChipScroller>
                </Group>
                <Group label={`${secondLabel}, м`}>
                  <ChipScroller>
                    {lengths.map((s) => (
                      <Chip key={s} active={s === current} onClick={() => setSizeIdx(s)}>
                        {fmt(dims[s][1])}
                      </Chip>
                    ))}
                  </ChipScroller>
                </Group>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border-[1.5px] border-dashed border-seam p-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <NumField label={rollWidth ? "Длина, м" : `${firstLabel}, м`} value={cw} onChange={setCw} />
              <NumField label={rollWidth ? "Ширина, м" : `${secondLabel}, м`} value={cl} onChange={setCl} />
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              Считаем по медианной цене {formatPrice(perM2)} за м²
              {p.options.length > 1 ? ` для пропитки «${p.options[option]}»` : ""}. От 0,5 до 30 × 50 м.
            </p>
            {(cw || cl) && !customValid && (
              <p className="mt-2 text-sm font-medium text-danger" role="alert">
                Укажите оба размера от 0,5 м: первый до 30 м, второй до 50 м.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* итог */}
      <div className="rounded-[22px] bg-ink p-5 text-paper">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div>
            <div className="flex items-center gap-2 text-sm text-paper/70">
              <Ruler className="size-4" aria-hidden />
              {custom
                ? customValid
                  ? `${fmt(w)} × ${fmt(l)} м · ${formatArea(customArea)}`
                  : "Введите размер"
                : `${fmt(curW)} × ${fmt(curL)} м · ${formatArea(data.areas[current] ?? 0)}`}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <PriceTicker value={total} className="font-display text-5xl leading-none font-extrabold" />
              {custom && <span className="rounded-md bg-strap px-1.5 py-0.5 text-xs font-semibold text-ink">ориентировочно</span>}
            </div>
          </div>
          <div className="flex items-center rounded-full bg-paper/10">
            <button type="button" className="grid size-11 place-items-center" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Меньше">
              <Minus className="size-4" />
            </button>
            <span className="w-7 text-center font-semibold tabular-nums" aria-live="polite">
              {qty}
            </span>
            <button type="button" className="grid size-11 place-items-center" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Больше">
              <Plus className="size-4" />
            </button>
          </div>
        </div>
        {qty > 1 && unitPrice > 0 && <p className="mt-1 text-sm text-paper/60">{formatPrice(unitPrice)} за штуку</p>}
        {unitWeight > 0 && (
          <p className="mt-2 flex items-center gap-2 text-sm text-paper/70">
            <Package className="size-4 shrink-0" aria-hidden />
            {custom ? "≈ " : ""}
            {formatWeight(unitWeight * qty)}
            {box && ` · упаковка ${box} см`}
          </p>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={custom && !customValid}
          className="btn btn-strap mt-4 w-full rounded-2xl text-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          <AnimatePresence mode="wait" initial={false}>
            {added ? (
              <motion.span key="ok" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="flex items-center gap-2">
                <Check className="size-5" /> Добавлено в заявку
              </motion.span>
            ) : (
              <motion.span key="add" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="flex items-center gap-2">
                <ShoppingBag className="size-5" /> Добавить в заявку
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <AnimatePresence>
          {added && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <Link href="/cart" className="mt-3 block text-center text-sm font-semibold text-strap underline underline-offset-4">
                Перейти к оформлению заявки
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Group({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline gap-2 text-[0.95rem]">
        <span className="font-semibold">{label}</span>
        {value && <span className="text-ink-soft">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "min-h-11 shrink-0 rounded-xl border-[1.5px] px-3.5 text-[0.95rem] font-medium tabular-nums transition-colors",
        active ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-seam",
      )}
    >
      {children}
    </button>
  );
}

function ChipScroller({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar -mx-1 flex max-h-[10.25rem] flex-wrap gap-2 overflow-y-auto px-1 py-0.5">{children}</div>;
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <input
        inputMode="decimal"
        className="field font-display text-2xl font-bold"
        placeholder="0,0"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, "").slice(0, 5))}
      />
    </label>
  );
}
