import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, CreditCard, Mail, MapPin, MessageCircle, Navigation, Phone, Send, Truck, Warehouse } from "lucide-react";
import { deliveryServices, routeUrl, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Контакты",
  description: `Телефон, адрес производства в Янино-1 (Ленинградская область), самовывоз и доставка «Хочу Тент». ${site.hours}.`,
  alternates: { canonical: "/contacts" },
};

export default function ContactsPage() {
  const { lat, lon } = site.map;
  const ld = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.name,
    telephone: site.phone,
    email: site.email,
    url: site.url,
    address: { "@type": "PostalAddress", streetAddress: site.address, addressLocality: site.city, addressRegion: site.region, addressCountry: "RU" },
    hasMap: site.yandexOrgUrl,
    geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lon },
    openingHours: site.hours,
  };

  return (
    <div className="wrap pt-24 pb-20 md:pt-32">
      <h1 className="text-[3.6rem] md:text-[7rem]">Контакты</h1>

      <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-4">
          <a href={site.phoneHref} className="group rounded-[28px] bg-tarp p-6 text-paper md:p-8">
            <Phone className="size-6 text-strap" aria-hidden />
            <span className="mt-4 block font-display text-[2.8rem] leading-none font-extrabold group-hover:text-strap md:text-6xl">{site.phone}</span>
            <span className="mt-2 flex items-center gap-2 text-paper/70">
              <Clock3 className="size-4" aria-hidden /> {site.hours}
            </span>
          </a>

          <div className="grid grid-cols-2 gap-4">
            <a href={site.telegram} target="_blank" rel="noopener" className="flex flex-col gap-3 rounded-[24px] bg-paper p-5 hover:bg-white">
              <Send className="size-6 text-oxford" aria-hidden />
              <span className="font-semibold">Telegram</span>
            </a>
            <a href={site.whatsapp} target="_blank" rel="noopener" className="flex flex-col gap-3 rounded-[24px] bg-paper p-5 hover:bg-white">
              <MessageCircle className="size-6 text-ok" aria-hidden />
              <span className="font-semibold">WhatsApp</span>
            </a>
          </div>

          <a href={`mailto:${site.email}`} className="flex items-center gap-3 rounded-[24px] bg-paper p-5 hover:bg-white">
            <Mail className="size-5" aria-hidden />
            <span className="font-semibold">{site.email}</span>
          </a>

          <div className="rounded-[24px] border-2 border-dashed border-line p-5">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">{site.address}</p>
                <p className="mt-1 text-ink-soft">{site.addressNote}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={routeUrl} target="_blank" rel="noopener" className="btn btn-ink min-h-11 px-4 text-sm">
                    <Navigation className="size-4" aria-hidden /> Построить маршрут
                  </a>
                  <a href={site.yandexOrgUrl} target="_blank" rel="noopener" className="btn btn-ghost min-h-11 px-4 text-sm">
                    Открыть в Яндекс Картах
                  </a>
                </div>
              </div>
            </div>
          </div>

          <dl className="text-sm text-ink-soft">
            <dt className="sr-only">Реквизиты</dt>
            <dd>{site.legalName}</dd>
            <dd>ИНН {site.inn}, ОГРН {site.ogrn}</dd>
          </dl>
        </div>

        <div className="min-h-[24rem] overflow-hidden rounded-[28px] bg-paper">
          {/* карточка организации «ХОЧУТЕНТ» из Яндекс Карт: отзывы, маршрут, часы работы */}
          <iframe
            title="«Хочу Тент» на Яндекс Картах"
            src={`https://yandex.ru/map-widget/v1/?ll=${lon}%2C${lat}&mode=search&oid=${site.yandexOrgId}&ol=biz&z=15`}
            className="h-full min-h-[24rem] w-full border-0"
            loading="lazy"
            allowFullScreen
          />
        </div>
      </div>

      {/* как получить заказ: самовывоз, доставка, оплата */}
      <section id="delivery" className="mt-16 scroll-mt-24">
        <h2 className="text-[2.8rem] md:text-6xl">Получение и оплата</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col rounded-[28px] bg-paper p-6">
            <Warehouse className="size-7 text-tarp" aria-hidden />
            <h3 className="mt-4 text-[2rem]">Самовывоз</h3>
            <p className="mt-1 font-semibold">Бесплатно</p>
            <p className="mt-2 text-ink-soft">{site.address}. {site.addressNote}</p>
            <a href={routeUrl} target="_blank" rel="noopener" className="btn btn-ghost mt-auto min-h-12 w-fit px-5 text-base max-lg:mt-5 lg:mt-6">
              <Navigation className="size-4" aria-hidden /> Маршрут
            </a>
          </div>
          <div className="flex flex-col rounded-[28px] bg-paper p-6">
            <Truck className="size-7 text-tarp" aria-hidden />
            <h3 className="mt-4 text-[2rem]">Доставка по России</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {deliveryServices.map((d) => (
                <li key={d.id} className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-0">
                  <span className="font-semibold">{d.title}</span>
                  <span className="text-right text-sm text-ink-soft">{d.note}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-ink-soft">Стоимость — по тарифу службы, считаем по весу и габаритам заказа.</p>
          </div>
          <div className="flex flex-col rounded-[28px] bg-tarp p-6 text-paper">
            <CreditCard className="size-7 text-strap" aria-hidden />
            <h3 className="mt-4 text-[2rem]">Оплата</h3>
            <p className="mt-2 text-paper/75">Соберите заказ в корзине, выберите самовывоз или доставку и нажмите «Оплатить». Для юрлиц и ИП — оплата по счёту.</p>
            <Link href="/cart" className="btn btn-strap mt-auto min-h-12 w-fit px-6 text-base max-lg:mt-5 lg:mt-6">
              Оформить и оплатить
            </Link>
          </div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
  );
}
