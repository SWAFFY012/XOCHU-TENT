import type { Metadata } from "next";
import { Clock3, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Контакты",
  description: `Телефон, адрес цеха и мессенджеры «Хочу Тент». ${site.hours}.`,
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
    address: { "@type": "PostalAddress", streetAddress: site.address, addressLocality: site.city, addressCountry: "RU" },
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
          <iframe
            title="Цех «Хочу Тент» на карте"
            src={`https://yandex.ru/map-widget/v1/?ll=${lon}%2C${lat}&z=15&pt=${lon}%2C${lat}%2Cpm2rdm`}
            className="h-full min-h-[24rem] w-full border-0"
            loading="lazy"
          />
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
  );
}
