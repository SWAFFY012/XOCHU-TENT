"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { clsx } from "clsx";
import { ProductCard } from "@/components/ProductCard";
import { categories, materials } from "@/lib/content";
import { hexOf } from "@/lib/colors";
import { plural } from "@/lib/format";
import type { CategoryId, MaterialId, ProductSummary } from "@/lib/types";

const SORTS = [
  { id: "popular", label: "Популярные" },
  { id: "price-asc", label: "Сначала дешевле" },
  { id: "price-desc", label: "Сначала дороже" },
  { id: "m2-asc", label: "Дешевле за м²" },
  { id: "name", label: "По названию" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

const MATERIAL_FILTER: MaterialId[] = ["brezent", "oxford", "pvh", "pvh-clear", "mesh"];

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);
const price = (v: string | null) => v !== null && v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;

export function CatalogClient({ products }: { products: ProductSummary[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [sheet, setSheet] = useState(false);

  // Состояние фильтров живёт в URL
  const q = params.get("q") ?? "";
  const cats = list(params.get("cat")) as CategoryId[];
  const mats = list(params.get("mat")) as MaterialId[];
  const cols = list(params.get("color"));
  const min = price(params.get("min"));
  const max = price(params.get("max"));
  const sort = (params.get("sort") as SortId) || "popular";

  const [query, setQuery] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  if (syncedQ !== q) {
    setSyncedQ(q);
    setQuery(q);
  }

  const update = (patch: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      const val = Array.isArray(v) ? v.join(",") : v;
      if (!val) next.delete(k);
      else next.set(k, val);
    }
    const s = next.toString();
    startTransition(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  };

  // Поиск с задержкой, чтобы не дёргать историю на каждую букву
  useEffect(() => {
    if (query === q) return;
    const t = setTimeout(() => update({ q: query.trim() || null }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const toggle = (key: string, arr: string[], v: string) =>
    update({ [key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] });

  const allColors = useMemo(() => [...new Set(products.flatMap((p) => p.colors))], [products]);

  const result = useMemo(() => {
    const needle = q.toLowerCase().trim();
    const r = products.filter((p) => {
      if (cats.length && !cats.includes(p.category)) return false;
      if (mats.length && !mats.includes(p.material)) return false;
      if (cols.length && !cols.some((c) => p.colors.includes(c))) return false;
      if (min !== null && p.priceFrom < min) return false;
      if (max !== null && p.priceFrom > max) return false;
      if (needle) {
        const hay = [p.title, p.short, materials[p.material].title, categories.find((c) => c.id === p.category)?.title, ...p.colors, ...p.options]
          .join(" ")
          .toLowerCase();
        if (!needle.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    const by: Record<SortId, (a: ProductSummary, b: ProductSummary) => number> = {
      popular: (a, b) => a.rank - b.rank,
      "price-asc": (a, b) => a.priceFrom - b.priceFrom,
      "price-desc": (a, b) => b.priceFrom - a.priceFrom,
      "m2-asc": (a, b) => a.pricePerM2Median - b.pricePerM2Median,
      name: (a, b) => a.title.localeCompare(b.title, "ru"),
    };
    return r.sort(by[sort] ?? by.popular);
  }, [products, q, cats, mats, cols, min, max, sort]);

  const activeCount = cats.length + mats.length + cols.length + (min !== null || max !== null ? 1 : 0);
  const reset = () => update({ cat: null, mat: null, color: null, min: null, max: null, q: null });

  const filters = (
    <div className="flex flex-col gap-7">
      <FilterGroup title="Изделие">
        {categories.map((c) => (
          <Check key={c.id} checked={cats.includes(c.id)} onChange={() => toggle("cat", cats, c.id)}>
            {c.title}
            <span className="ml-auto text-sm text-ink-soft">{products.filter((p) => p.category === c.id).length}</span>
          </Check>
        ))}
      </FilterGroup>
      <FilterGroup title="Материал">
        {MATERIAL_FILTER.map((m) => (
          <Check key={m} checked={mats.includes(m)} onChange={() => toggle("mat", mats, m)}>
            {materials[m].title}
          </Check>
        ))}
      </FilterGroup>
      <FilterGroup title="Цвет">
        <div className="flex flex-wrap gap-2">
          {allColors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggle("color", cols, c)}
              aria-pressed={cols.includes(c)}
              className={clsx(
                "flex min-h-10 items-center gap-2 rounded-full border-[1.5px] py-1 pr-3 pl-1.5 text-sm transition-colors",
                cols.includes(c) ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-seam",
              )}
            >
              <span className="size-6 rounded-full ring-1 ring-black/15" style={{ background: hexOf(c) }} />
              {c}
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Цена, ₽">
        <PriceRange key={`${min}:${max}`} min={min} max={max} onApply={(from, to) => update({ min: from, max: to })} />
      </FilterGroup>
      {activeCount > 0 && (
        <button type="button" onClick={reset} className="btn btn-ghost">
          Сбросить фильтры
        </button>
      )}
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-24">{filters}</div>
      </aside>

      <div>
        <div className="sticky top-16 z-20 -mx-4 mb-5 flex flex-wrap items-center gap-2 bg-chalk/90 px-4 py-3 backdrop-blur md:top-[4.5rem] lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
          <label className="relative min-w-0 flex-1 basis-full sm:basis-auto">
            <span className="sr-only">Поиск по каталогу</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-soft" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Например: штора ПВХ или брезент огнестойкий"
              className="field rounded-full pl-11"
            />
          </label>
          <button type="button" onClick={() => setSheet(true)} className="btn btn-ghost min-h-11 flex-1 sm:flex-none lg:hidden">
            <SlidersHorizontal className="size-4" /> Фильтры{activeCount ? ` · ${activeCount}` : ""}
          </button>
          <label className="flex-1 sm:flex-none">
            <span className="sr-only">Сортировка</span>
            <select value={sort} onChange={(e) => update({ sort: e.target.value === "popular" ? null : e.target.value })} className="field min-h-11 rounded-full py-2 pr-8">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mb-4 text-sm text-ink-soft" aria-live="polite">
          {result.length} {plural(result.length, "изделие", "изделия", "изделий")}
        </p>

        {result.length ? (
          <motion.div layout className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5">
            <AnimatePresence mode="popLayout" initial={false}>
              {result.map((p, i) => (
                <motion.div
                  key={p.slug}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.25 }}
                >
                  <ProductCard p={p} priority={i < 4} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-line p-10 text-center">
            <p className="font-display text-4xl font-extrabold">Ничего не нашли</p>
            <p className="mt-2 text-ink-soft">Уберите часть фильтров или напишите нам — сошьём под ваш размер.</p>
            <button type="button" onClick={reset} className="btn btn-ink mt-5">
              Сбросить фильтры
            </button>
          </div>
        )}
      </div>

      {/* фильтры на телефоне */}
      <AnimatePresence>
        {sheet && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Фильтры">
            <motion.button
              type="button"
              aria-label="Закрыть фильтры"
              className="absolute inset-0 bg-ink/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheet(false)}
            />
            <motion.div
              className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[28px] bg-chalk"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <span className="font-display text-4xl font-extrabold">Фильтры</span>
                <button type="button" onClick={() => setSheet(false)} className="grid size-11 place-items-center rounded-full" aria-label="Закрыть">
                  <X className="size-5" />
                </button>
              </div>
              <div data-lenis-prevent className="overflow-y-auto overscroll-contain px-5 pb-4">{filters}</div>
              <div className="border-t border-line p-4">
                <button type="button" onClick={() => setSheet(false)} className="btn btn-strap w-full">
                  Показать {result.length} {plural(result.length, "изделие", "изделия", "изделий")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PriceRange({ min, max, onApply }: { min: number | null; max: number | null; onApply: (from: string | null, to: string | null) => void }) {
  const [from, setFrom] = useState(min?.toString() ?? "");
  const [to, setTo] = useState(max?.toString() ?? "");
  const [error, setError] = useState("");
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      if (from && to && Number(from) > Number(to)) {
        setError("Цена «от» должна быть не больше цены «до».");
        return;
      }
      setError("");
      onApply(from ? String(Number(from)) : null, to ? String(Number(to)) : null);
    }} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0 text-sm">От
          <input type="number" inputMode="numeric" min="0" step="1" value={from} onChange={(event) => { setFrom(event.target.value); setError(""); }} placeholder="0" className="field mt-1 w-full min-w-0" aria-label="Цена от" aria-invalid={!!error} />
        </label>
        <label className="min-w-0 text-sm">До
          <input type="number" inputMode="numeric" min="0" step="1" value={to} onChange={(event) => { setTo(event.target.value); setError(""); }} placeholder="Любая" className="field mt-1 w-full min-w-0" aria-label="Цена до" aria-invalid={!!error} />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" className="btn btn-ink min-h-11 w-full">Применить</button>
    </form>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-1 hover:bg-ink/4">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-5 accent-[var(--color-tarp)]" />
      {children}
    </label>
  );
}
