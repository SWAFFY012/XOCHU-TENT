"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Ruler, Truck } from "lucide-react";
import { clsx } from "clsx";
import { ProductArt } from "./ProductArt";
import { formatPrice, plural } from "@/lib/format";
import { hexOf } from "@/lib/colors";
import { site } from "@/lib/site";
import type { ProductSummary } from "@/lib/types";

/**
 * Карточка в духе Ozon: высокое превью, при наведении зоны превью
 * переключают цвета (как листание фото), под превью — точки галереи.
 */
export function ProductCard({ p, priority }: { p: ProductSummary; priority?: boolean }) {
  const photos = p.frames.length ? p.frames : null;
  const frames = photos ?? p.colors.slice(0, 6);
  const [active, setActive] = useState(0);
  // Остальные кадры грузим только после первого наведения
  const [warm, setWarm] = useState(false);
  const href = `/catalog/${p.slug}`;

  return (
    <article className="group relative flex flex-col">
      <Link
        href={href}
        scroll={false}
        prefetch={false}
        className="relative block aspect-[3/4] overflow-hidden rounded-[18px] bg-[#e1e6dd]"
        onMouseEnter={() => setWarm(true)}
        onMouseLeave={() => setActive(0)}
        aria-label={p.title}
      >
        {photos?.length ? (
          // Кадры лежат стопкой: при наведении меняется только прозрачность
          photos.map((src, i) => (i === 0 || warm) && (
            <Image
              key={src}
              src={src}
              alt={i === 0 ? p.title : ""}
              fill
              sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 48vw"
              className={clsx("object-cover transition-opacity duration-200", i === active ? "opacity-100" : "opacity-0")}
              priority={priority && i === 0}
            />
          ))
        ) : (
          <ProductArt
            kind={p.kind}
            color={frames[active]}
            title={`${p.title}, цвет ${frames[active].toLowerCase()}`}
            className="absolute inset-0 h-full w-full p-[8%] transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        )}

        {/* зоны наведения = «листание» */}
        {frames.length > 1 && (
          <div className="absolute inset-0 flex">
            {frames.map((_, i) => (
              <span key={i} className="h-full flex-1" onMouseEnter={() => setActive(i)} />
            ))}
          </div>
        )}

        <div className={clsx("absolute left-2.5 flex items-start gap-1", photos ? "right-2.5 bottom-8 flex-wrap" : "top-2.5 flex-col")}>
          {p.badges.slice(0, 2).map((b, i) => (
            <span
              key={b}
              className={clsx(
                "rounded-md px-1.5 py-[3px] text-[0.68rem] leading-none font-semibold sm:px-2 sm:text-[0.75rem]",
                i === 0 ? "bg-strap text-ink" : "hidden bg-paper/90 text-ink backdrop-blur sm:inline",
              )}
            >
              {b}
            </span>
          ))}
        </div>

        {/* плашка цвета, как подпись на инфографике */}
        {!photos && (
        <span className="absolute right-2.5 bottom-6 flex items-center gap-1.5 rounded-full bg-paper/90 py-1 pr-2.5 pl-1 text-[0.75rem] font-medium backdrop-blur">
          <span className="size-4 rounded-full ring-1 ring-black/15" style={{ background: hexOf(frames[active]) }} />
          {frames[active]}
        </span>
        )}

        {frames.length > 1 && (
          <div className="absolute inset-x-0 bottom-2 mx-auto flex w-fit justify-center gap-1 rounded-full bg-paper/70 px-1.5 py-1 backdrop-blur">
            {frames.map((_, i) => (
              <span
                key={i}
                className={clsx("h-1.5 rounded-full transition-all", i === active ? "w-3 bg-ink/80" : "w-1.5 bg-ink/25")}
              />
            ))}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col px-0.5 pt-2.5">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[1.9rem] leading-none font-extrabold tracking-tight">
            <span className="mr-1 text-[1.15rem] font-bold text-ink-soft">от</span>
            {formatPrice(p.priceFrom)}
          </span>
        </div>
        <span className="mt-1 text-[0.8rem] text-ink-soft">≈ {formatPrice(p.pricePerM2Median)} за м²</span>

        <Link href={href} scroll={false} prefetch={false} className="mt-1.5 line-clamp-2 text-[0.95rem] leading-snug hover:text-oxford">
          {p.title}
        </Link>

        <span className="mt-1.5 flex items-center gap-1.5 text-[0.8rem] text-ink-soft">
          <Ruler className="size-3.5" aria-hidden />
          {p.sizesCount} {plural(p.sizesCount, "размер", "размера", "размеров")} · {p.colors.length}{" "}
          {plural(p.colors.length, "цвет", "цвета", "цветов")}
        </span>

        <span className="mt-auto pt-3">
          <span className="mb-2 flex w-fit items-center gap-1.5 rounded-lg bg-ok/10 px-2 py-1 text-[0.8rem] font-medium text-ok">
            <Truck className="size-3.5" aria-hidden />
            Пошив {site.productionDays}
          </span>
          <Link href={href} scroll={false} prefetch={false} className="btn btn-strap min-h-11 w-full rounded-xl text-[0.95rem]">
            Выбрать размер
          </Link>
        </span>
      </div>
    </article>
  );
}
