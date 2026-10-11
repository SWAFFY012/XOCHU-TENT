"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useState } from "react";
import { clsx } from "clsx";
import { ProductArt } from "@/components/ProductArt";
import { Configurator, type Selection } from "./Configurator";
import { formatPrice } from "@/lib/format";
import type { ClientMedia, CompactVariants, ProductSummary } from "@/lib/types";

type Props = {
  p: ProductSummary;
  data: CompactVariants;
  media?: ClientMedia | null;
  /** В выезжающей панели — одна колонка */
  compact?: boolean;
  heading: React.ReactNode;
  details: React.ReactNode;
};

export function ProductView({ p, data, media, compact, heading, details }: Props) {
  const [color, setColor] = useState(0);
  const [sel, setSel] = useState<Selection | null>(null);
  const onSelect = useCallback((s: Selection) => setSel(s), []);

  // Фото под выбор: карточка размера -> обложка пропитки/цвета -> первая обложка
  const option = sel?.option ?? p.options[0];
  const key = !media ? "" : media.axis === "option" ? option : media.axis === "color" ? p.colors[color] : `${option}|${p.colors[color]}`;
  // Путь к карточке размера собирается из папки и размера: «1,5х0,8» -> base/15x08.webp
  const sizeEntry = media?.sizes[key];
  const sizeImg =
    sizeEntry && sel && !sel.custom && sizeEntry.idx.includes(data.sizes.indexOf(sel.size))
      ? `${sizeEntry.base}/${sel.size.replace(/[,.]/g, "").replace(/х/g, "x")}.webp`
      : undefined;
  const main = media ? sizeImg || media.covers[key] || Object.values(media.covers)[0] : undefined;
  const gallery = media ? (media.gallery[key] ?? Object.values(media.gallery)[0] ?? []) : [];
  const images = main ? [main, ...gallery] : [];

  // При смене фото под выбор возвращаемся к первому кадру
  const [thumb, setThumb] = useState(0);
  const [seenMain, setSeenMain] = useState(main);
  if (seenMain !== main) {
    setSeenMain(main);
    setThumb(0);
  }
  const shown = images[thumb] ?? main;

  return (
    <div className={compact ? "flex flex-col gap-6" : "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14"}>
      <div className={compact ? "min-w-0" : "min-w-0 lg:sticky lg:top-24 lg:self-start"}>
        <div
          className={clsx(
            "relative overflow-hidden rounded-[26px]",
            shown ? "bg-white" : "bg-[#e1e6dd]",
            compact ? "aspect-[4/3]" : shown ? "aspect-[3/4]" : "aspect-[4/5] sm:aspect-square",
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {shown ? (
              <motion.div
                key={shown}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Image
                  src={shown}
                  alt={`${p.title}${sel ? `, ${sel.option}, ${sel.size.replace("х", " × ")} м` : ""}`}
                  fill
                  sizes={compact ? "(min-width:768px) 700px, 100vw" : "(min-width:1024px) 45vw, 100vw"}
                  className={compact ? "object-contain" : "object-cover"}
                  priority={thumb === 0}
                />
              </motion.div>
            ) : (
              <motion.div
                key={p.colors[color]}
                className="absolute inset-0"
                initial={{ clipPath: "inset(0 50% 0 50%)" }}
                animate={{ clipPath: "inset(0 0% 0 0%)" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
              >
                <ProductArt kind={p.kind} color={p.colors[color]} title={`${p.title}, ${p.colors[color].toLowerCase()}`} className="h-full w-full p-[9%]" />
              </motion.div>
            )}
          </AnimatePresence>

          {!shown && (
            <>
              <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
                {p.badges.map((b, i) => (
                  <span key={b} className={i === 0 ? "rounded-md bg-strap px-2 py-1 text-xs font-semibold" : "rounded-md bg-paper/90 px-2 py-1 text-xs font-semibold"}>
                    {b}
                  </span>
                ))}
              </div>
              <div className="absolute right-4 bottom-4 left-4 flex items-end justify-between gap-3">
                <span className="font-display text-[3.4rem] leading-[0.8] font-black text-ink/12 sm:text-[5rem]" aria-hidden>
                  {data.sizes[data.sizes.length - 1]?.replace("х", "×")}
                </span>
                <span className="rounded-full bg-paper/90 px-3 py-1.5 text-sm font-medium backdrop-blur">
                  {formatPrice(p.priceFrom)} – {formatPrice(p.priceTo)}
                </span>
              </div>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Фото товара">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                role="tab"
                aria-selected={i === thumb}
                aria-label={i === 0 ? "Фото выбранного размера" : `Фото ${i + 1}`}
                onClick={() => setThumb(i)}
                className={clsx(
                  "relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-xl bg-white ring-2 transition md:w-[4.5rem]",
                  i === thumb ? "ring-ink" : "ring-transparent opacity-75 hover:opacity-100",
                )}
              >
                <Image src={src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-7">
        {heading}
        <Configurator p={p} data={data} color={color} onColor={setColor} onSelect={onSelect} image={main} />
        {details}
      </div>
    </div>
  );
}
