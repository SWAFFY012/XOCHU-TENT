import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, Building2, Clock3, CreditCard, Download, FileText, Factory, PackageCheck, Ruler, ShieldCheck, Truck } from "lucide-react";
import { SectionReveal } from "@/components/motion/SectionReveal";
import Image from "next/image";
import { deliveryServices, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "О производстве, доставке и оплате",
  description:
    "Собственный цех по пошиву тентов, штор и мягких окон в Янино-1 под Петербургом. Товарный знак «ХОЧУТЕНТ», самовывоз, доставка СДЭК, Почтой России, Ozon, Деловыми Линиями и ПЭК.",
  alternates: { canonical: "/about" },
};

const FACTS = [
  { icon: Factory, t: `Цех ${site.workshopArea}`, d: "Раскрой, сварка ПВХ и пошив в одном помещении. Не перепродаём чужие изделия." },
  { icon: Ruler, t: "Размер до сантиметра", d: "Шьём по вашим замерам, если стандартный размер не подходит." },
  { icon: Clock3, t: site.productionDays, d: "Срок пошива нестандартных изделий. Стандарт отгружаем со склада." },
  { icon: PackageCheck, t: site.dailyOutput, d: "Справляемся с оптовыми заказами для строек, автопарков и турбаз." },
];

const DELIVERY = [
  { icon: Building2, t: "Самовывоз — бесплатно", d: `С производства: ${site.address}. Предупредите о приезде заранее.` },
  ...deliveryServices.map((s) => ({ icon: Truck, t: s.title, d: `Доставка по России: ${s.note}. Стоимость по тарифу службы, по весу и габаритам заказа.` })),
];

// Свидетельство на товарный знак: файлы лежат в public/docs
const TM = {
  number: "1223955",
  pdf: "/docs/svidetelstvo-tovarnyj-znak-1223955.pdf",
  jpg: "/docs/svidetelstvo-tovarnyj-znak-1223955.jpg",
  preview: "/docs/svidetelstvo-tovarnyj-znak-1223955.webp",
};

const PAYMENT = [
  { icon: Banknote, t: "По счёту", d: "Для юрлиц и ИП. Закрывающие документы отправим с заказом." },
  { icon: CreditCard, t: "Онлайн на сайте", d: "Соберите заказ в корзине, выберите самовывоз или доставку и нажмите «Оплатить». Пока подключаем онлайн-оплату, менеджер присылает ссылку." },
];

export default function AboutPage() {
  return (
    <>
      <section className="wrap pt-24 pb-14 md:pt-32">
        <div className="flex flex-col gap-7">
          <h1 className="max-w-[18ch] text-[clamp(4.2rem,10vw,12rem)]">Шьём тенты с {site.foundedYear} года</h1>
          <p className="max-w-[60ch] text-xl leading-relaxed text-ink-soft md:text-2xl">
            {/* TODO: история компании */}
            «Хочу Тент» — мастерская с собственным раскроем, пошивом и сваркой ПВХ. На Ozon у нас рейтинг {site.ozonStats.rating} и
            {" "}{site.ozonStats.orders} заказов, а здесь можно заказать напрямую, в том числе нестандартный размер.
          </p>
        </div>
        {/* TODO: заменить на фото цеха */}
        <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-[32px] bg-tarp md:aspect-[21/9]">
          <video className="h-full w-full object-cover opacity-80" src="/hero-720.mp4" poster="/hero-poster.jpg" muted loop autoPlay playsInline preload="none" aria-hidden />
          <span className="absolute bottom-4 left-4 rounded-full bg-paper/90 px-3 py-1.5 text-sm font-medium">Кадры из нашего цеха</span>
        </div>
      </section>

      <SectionReveal variant="curtain" className="wrap py-14">
        <h2 className="text-5xl md:text-7xl">Производство</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-[26px] bg-paper p-6">
              <Icon className="size-8 text-tarp" strokeWidth={1.6} aria-hidden />
              <h3 className="mt-5 text-[2rem]">{t}</h3>
              <p className="mt-2 text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </SectionReveal>

      {/* товарный знак: свидетельство Роспатента */}
      <section id="trademark" className="wrap scroll-mt-24 py-14">
        <div className="grid items-center gap-8 rounded-[32px] bg-paper p-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-12 md:p-10">
          <a href={TM.jpg} target="_blank" rel="noopener" className="group relative mx-auto block w-full max-w-sm overflow-hidden rounded-2xl shadow-[0_18px_50px_-20px_rgba(0,0,0,.35)]">
            <Image
              src={TM.preview}
              alt={`Свидетельство на товарный знак «ХОЧУТЕНТ» № ${TM.number}`}
              width={900}
              height={1273}
              sizes="(min-width: 768px) 384px, 90vw"
              className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </a>
          <div>
            <p className="flex items-center gap-2 font-semibold text-tarp">
              <ShieldCheck className="size-5" aria-hidden /> Зарегистрированный бренд
            </p>
            <h2 className="mt-3 text-5xl md:text-7xl">Товарный знак «ХОЧУТЕНТ»</h2>
            <p className="mt-5 max-w-[52ch] text-lg text-ink-soft">
              Название «ХОЧУТЕНТ» — зарегистрированный товарный знак. Свидетельство № {TM.number} выдано Федеральной службой
              по интеллектуальной собственности (Роспатент): знак внесён в Государственный реестр товарных знаков 26 мая 2026 года.
              Изделия под этим именем шьём только мы.
            </p>
            <dl className="mt-6 grid max-w-lg grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-ink-soft">Номер свидетельства</dt>
                <dd className="font-semibold">№ {TM.number}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Приоритет</dt>
                <dd className="font-semibold">31 января 2025 г.</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Зарегистрирован</dt>
                <dd className="font-semibold">26 мая 2026 г.</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Действует до</dt>
                <dd className="font-semibold">31 января 2035 г.</dd>
              </div>
            </dl>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={TM.pdf} target="_blank" rel="noopener" className="btn btn-ink min-h-12 px-5 text-base">
                <FileText className="size-5" aria-hidden /> Свидетельство, PDF
              </a>
              <a href={TM.jpg} download className="btn btn-ghost min-h-12 px-5 text-base">
                <Download className="size-5" aria-hidden /> Изображение, JPG
              </a>
            </div>
          </div>
        </div>
      </section>

      <SectionReveal variant="seam" id="delivery" className="bg-tarp py-20 text-paper">
        <div className="wrap grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-5xl md:text-7xl">Доставка</h2>
            <ul className="mt-8 flex flex-col gap-6">
              {DELIVERY.map(({ icon: Icon, t, d }) => (
                <li key={t} className="flex gap-4">
                  <Icon className="mt-1 size-6 shrink-0 text-strap" aria-hidden />
                  <div>
                    <h3 className="font-sans text-lg font-semibold">{t}</h3>
                    <p className="mt-1 text-paper/75">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div id="payment">
            <h2 className="text-5xl md:text-7xl">Оплата</h2>
            <p className="mt-4 max-w-[46ch] text-paper/75">
              Оплатите заказ на сайте или оставьте заявку — согласуем детали и выставим счёт.
            </p>
            <ul className="mt-6 flex flex-col gap-6">
              {PAYMENT.map(({ icon: Icon, t, d }) => (
                <li key={t} className="flex gap-4">
                  <Icon className="mt-1 size-6 shrink-0 text-strap" aria-hidden />
                  <div>
                    <h3 className="font-sans text-lg font-semibold">{t}</h3>
                    <p className="mt-1 text-paper/75">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionReveal>

      <SectionReveal variant="lift" className="wrap py-20">
        <div className="relative isolate min-h-[65svh] overflow-hidden rounded-[32px] bg-ink p-8 text-paper md:p-14">
          <Image src="/images/production-rolls-1920.webp" alt="" fill sizes="(min-width: 1400px) 1312px, 100vw" className="-z-20 object-cover" />
          <div className="absolute inset-0 -z-10 bg-ink/40" />
          <h2 className="max-w-[16ch] text-[clamp(3.5rem,6vw,7rem)]">Нужна партия для бизнеса?</h2>
          <p className="mt-6 max-w-[38ch] text-xl md:text-2xl">Пологи для автопарка, шторы для турбазы, укрытия для стройки — пришлите список, посчитаем опт.</p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/contacts" className="btn btn-strap min-h-16 px-7 text-lg">
              Связаться с производством
            </Link>
            <Link href="/catalog" className="btn btn-ghost min-h-16 px-7 text-lg">
              Каталог
            </Link>
          </div>
        </div>
      </SectionReveal>
    </>
  );
}
