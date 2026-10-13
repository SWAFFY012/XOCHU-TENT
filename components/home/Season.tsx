import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Snowflake } from "lucide-react";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { formatPrice } from "@/lib/format";
import type { ProductSummary } from "@/lib/types";

export type SeasonItem = { p: ProductSummary; points: string[] };

/**
 * Сезонные товары к зиме. На десктопе секция помещается в один экран целиком:
 * заголовок в одну строку с кнопкой в каталог, под ним три карточки.
 */
export function Season({ id, items }: { id: string; items: SeasonItem[] }) {
  return (
    <section id={id} className="flex flex-col justify-center bg-ink px-4 pt-24 pb-16 text-paper md:min-h-[100svh] md:px-[4vw] md:pt-[5.5rem] md:pb-[4vh]">
      <div className="grid items-end gap-x-10 gap-y-4 md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-jost flex items-center gap-2 text-lg text-strap">
            <Snowflake className="size-5" aria-hidden /> Сезон 2026/27
          </p>
          <SplitReveal
            text="Готовы к зиме"
            className="mt-2 font-manrope text-[15vw] leading-[0.9] font-normal tracking-[-0.03em] uppercase md:text-[7.4vw] md:whitespace-nowrap"
          />
          <p className="font-jost mt-3 max-w-[64ch] text-lg text-paper/75 md:text-xl md:[@media(max-height:820px)]:hidden">
            Самое ходовое перед холодами: утеплённые шторы держат тепло в гаражах и складах, ПВХ-тенты закрывают технику и грузы от снега.
          </p>
        </div>
        <Link href="/catalog" className="btn btn-strap min-h-14 w-fit px-8 text-lg">
          Весь каталог <ArrowRight className="size-5" aria-hidden />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:mt-[4vh] md:grid-cols-3 md:gap-5">
        {items.map(({ p, points }) => (
          <Link
            key={p.slug}
            href={`/catalog/${p.slug}`}
            scroll={false}
            prefetch={false}
            className="group flex flex-col overflow-hidden rounded-[24px] border border-paper/10 bg-paper/[0.04] transition-colors hover:border-strap/60"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-white md:aspect-auto md:h-[30vh] md:[@media(max-height:820px)]:h-[25vh]">
              {p.frames[0] && (
                <Image
                  src={p.frames[0]}
                  alt={p.title}
                  fill
                  sizes="(min-width:768px) 31vw, 100vw"
                  className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              )}
            </div>
            <div className="flex flex-1 flex-col p-5 md:p-6">
              <h3 className="text-[2.2rem] leading-[0.95] md:text-[2.6rem]">{p.title}</h3>
              <ul className="font-jost mt-3 flex flex-col gap-1.5 text-base text-paper/80 md:text-lg">
                {points.map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-2.5 h-px w-5 shrink-0 bg-strap" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-end justify-between gap-3 pt-4">
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
    </section>
  );
}
