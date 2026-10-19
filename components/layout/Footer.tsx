import Link from "next/link";
import { Logo } from "./Logo";
import { categories } from "@/lib/content";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden bg-tarp text-paper">
      <div className="seam text-paper/25" />
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-[34ch] text-paper/70">
            Шьём тенты, шторы, мягкие окна и теневые сетки. Режем брезент, Оксфорд и ПВХ на отрез.
          </p>
          <a href={site.ozon} target="_blank" rel="noopener" className="w-fit text-sm text-strap underline-offset-4 hover:underline">
            Магазин на Ozon: {site.ozonStats.rating} ★, {site.ozonStats.reviews} отзывов
          </a>
        </div>

        <nav aria-label="Каталог в подвале">
          <h2 className="mb-3 font-sans text-base font-semibold">Каталог</h2>
          <ul className="flex flex-col gap-2 text-paper/75">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/catalog?cat=${c.id}`} className="hover:text-paper">
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Компания">
          <h2 className="mb-3 font-sans text-base font-semibold">Компания</h2>
          <ul className="flex flex-col gap-2 text-paper/75">
            <li><Link href="/about" className="hover:text-paper">О производстве</Link></li>
            <li><Link href="/about#delivery" className="hover:text-paper">Доставка и оплата</Link></li>
            <li><Link href="/contacts" className="hover:text-paper">Контакты</Link></li>
            <li><Link href="/privacy" className="hover:text-paper">Политика конфиденциальности</Link></li>
          </ul>
        </nav>

        <div className="flex flex-col gap-2">
          <h2 className="mb-1 font-sans text-base font-semibold">Связаться</h2>
          <a href={site.phoneHref} className="font-display text-3xl font-extrabold hover:text-strap">
            {site.phone}
          </a>
          <a href={`mailto:${site.email}`} className="text-paper/75 hover:text-paper">{site.email}</a>
          <p className="text-paper/75">{site.address}</p>
          <p className="text-paper/55 text-sm">{site.hours}</p>
        </div>
      </div>

      <div className="wrap flex flex-col gap-2 border-t border-paper/10 py-6 text-xs text-paper/50 md:flex-row md:justify-between">
        <span>© <Year /> {site.legalName}. ИНН {site.inn}, ОГРНИП {site.ogrn}</span>
        <span>Цены на сайте не являются публичной офертой. Итоговую стоимость подтверждает менеджер.</span>
      </div>

      <div className="pointer-events-none -mb-[0.18em] font-display text-[23vw] leading-[0.75] font-black whitespace-nowrap text-paper/[0.05] select-none" aria-hidden>
        Хочу Тент
      </div>
    </footer>
  );
}

// Год фиксируется при сборке и обновляется вместе с кэшем
async function Year() {
  "use cache";
  return <>{new Date().getFullYear()}</>;
}
