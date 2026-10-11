import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Snowflake } from "lucide-react";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { formatPrice } from "@/lib/format";
import type { ProductSummary } from "@/lib/types";

export type SeasonItem = { p: ProductSummary; points: string[] };

/** Сезонные товары к зиме: тёмная секция, крупный текст, три большие карточки */
export function Season({ id, items }: { id: string; items: SeasonItem[] }) {
  return (
    <section id={id} className="bg-ink pt-24 pb-24 text-paper md:pt-36 md:pb-32">
      <div className="wrap">
        <p className="font-jost flex items-center gap-2 text-lg text-strap">
          <Snowflake className="size-5" aria-hidden /> Сезон 2026/27
        </p>
        <SplitReveal
          text="Готовы к зиме"
          className="mt-4 font-manrope text-[15vw] leading-[0.9] font-normal tracking-[-0.03em] uppercase md:text-[11.5vw]"
        />
        <p className="font-jost mt-6 max-w-[60ch] text-xl text-paper/75 md:text-2xl">
          Самое ходовое перед холодами: утеплённые шторы держат тепло в гаражах и складах, ПВХ-тенты закрывают технику и грузы от снега.
        </p>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {items.map(({ p, points }) => (
            <Link
              key={p.slug}
              href={`/catalog/${p.slug}`}
              scroll={false}
              prefetch={false}
              className="group flex flex-col overflow-hidden rounded-[28px] border border-paper/10 bg-paper/[0.04] transition-colors hover:border-strap/60"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-white">
                {p.frames[0] && (
                  <Image
                    src={p.frames[0]}
                    alt={p.title}
                    fill
                    sizes="(min-width:768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col p-6 md:p-7">
                <h3 className="text-[2.4rem] leading-[0.95] md:text-5xl">{p.title}</h3>
                <ul className="font-jost mt-5 flex flex-col gap-2.5 text-lg text-paper/80">
                  {points.map((t) => (
                    <li key={t} className="flex gap-3">
                      <span className="mt-2.5 h-px w-5 shrink-0 bg-strap" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-end justify-between gap-3 pt-7">
                  <span className="font-display text-4xl font-extrabold">
                    <span className="mr-1 text-xl text-paper/60">от</span>
                    {formatPrice(p.priceFrom)}
                  </span>
                  <span className="grid size-12 place-items-center rounded-full bg-strap text-ink transition-transform group-hover:rotate-45">
                    <ArrowUpRight className="size-5" aria-hidden />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
