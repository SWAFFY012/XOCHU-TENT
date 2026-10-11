import { Phone, Send } from "lucide-react";
import { Hero, type HeroSample } from "@/components/home/Hero";
import { CustomCalc } from "@/components/home/CustomCalc";
import { Faq } from "@/components/home/Faq";
import { MaterialsChapter, ProcessChapter } from "@/components/home/Chapters";
import { BigStatement } from "@/components/home/BigStatement";
import { Season } from "@/components/home/Season";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Marquee } from "@/components/motion/Marquee";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { getAllSummaries, getProduct } from "@/lib/catalog";
import { categories, materials } from "@/lib/content";
import { formatPrice, formatSize } from "@/lib/format";
import { materialSpecs, site } from "@/lib/site";

// Сезонные товары к зиме: «размерная лента» в hero и блок «Готовы к зиме»
const SEASON: { slug: string; areas: number[]; points: string[] }[] = [
  {
    slug: "shtora-oxford",
    areas: [5, 9],
    points: ["Синтепон 100 г/м² держит тепло", "Защита от ветра и снега до −40 °C", "Для гаражей, складов и мастерских"],
  },
  {
    slug: "shtora-brezent",
    areas: [5, 9],
    points: ["Брезент и синтепон, 460–530 г/м²", "Огнеупорная пропитка — для помещений с печью", "Утепление складов и боксов"],
  },
  {
    slug: "tent-pvh",
    areas: [12, 24],
    points: ["100% водонепроницаемый, 650 г/м²", "Не дубеет на морозе до −30 °C", "Укрытие техники и грузов от снега"],
  },
];

// Этапы производства; кадры — из видео цеха (public/process)
const STEPS = [
  { t: "Материал и расчёт", d: `Пришлите размеры или фото объекта. Подберём ткань и цвет, посчитаем стоимость за ${site.responseTime}.`, img: "/process/01-material-4k.webp" },
  { t: "Раскрой", d: "Режем полотно по вашим размерам. Припуск на подгиб и окантовку закладываем сразу.", img: "/process/02-cut-4k.webp" },
  { t: "Сварка ПВХ", d: "Тентовый ПВХ свариваем горячим воздухом — шов не пропускает воду и не расходится.", img: "/process/03-weld-4k.webp" },
  { t: "Пошив", d: "Брезент и Оксфорд шьём на промышленных машинах двойной строчкой.", img: "/process/04-sew-4k.webp" },
  { t: "Люверсы и фурнитура", d: "Ставим люверсы через каждые 50 см, по запросу — ремни, скобы, молнии.", img: "/process/05-grommets-4k.webp" },
  { t: "Проверка и отгрузка", d: "Проверяем размер рулеткой, складываем и отправляем транспортной компанией или курьером.", img: "/process/06-ready-4k.webp" },
];

// Чистые фото материалов из галерей товаров
const MATERIAL_PHOTO: Record<string, string> = {
  brezent: "/products/tent-brezent/gallery/vo-vodoupornaya/6.webp",
  oxford: "/products/tent-oxford/gallery/seryy/6.webp",
  pvh: "/products/tent-pvh/gallery/bezhevyy/6.webp",
};

export default function Home() {
  const all = getAllSummaries();
  // Для ленты берём реальные варианты сезонных товаров с площадью ближе к заданной
  // Товары чередуются: штора Оксфорд, штора брезент, тент ПВХ, затем другие размеры
  const samples: HeroSample[] = [0, 1].flatMap((k) =>
    SEASON.flatMap(({ slug, areas }) => {
      const p = getProduct(slug);
      if (!p) return [];
      const v = p.variants.reduce((b, x) => (Math.abs(x.area - areas[k]) < Math.abs(b.area - areas[k]) ? x : b));
      return [{ title: p.title, size: formatSize(v.size), price: formatPrice(v.price), href: `/catalog/${slug}` }];
    }),
  );
  const seasonItems = SEASON.flatMap(({ slug, points }) => {
    const p = all.find((x) => x.slug === slug);
    return p ? [{ p, points }] : [];
  });

  const perM2By = (mat: string) => Math.min(...all.filter((p) => p.material === mat).map((p) => p.pricePerM2Median));
  const compare = (["brezent", "oxford", "pvh"] as const).map((m) => ({
    id: m,
    ...materials[m],
    spec: materialSpecs[m],
    perM2: perM2By(m),
    traits: {
      brezent: [["Водостойкость", 3], ["Дышит", 5], ["Лёгкость", 2], ["Срок службы", 3]],
      oxford: [["Водостойкость", 4], ["Дышит", 2], ["Лёгкость", 5], ["Срок службы", 3]],
      pvh: [["Водостойкость", 5], ["Дышит", 1], ["Лёгкость", 1], ["Срок службы", 5]],
    }[m] as [string, number][],
  }));

  const strapItems = [
    "Брезент ВО, ОП и СКПВ",
    "Оксфорд 600D",
    "ПВХ 650 г/м²",
    "Люверсы через 50 см",
    `Нестандарт за ${site.productionDays}`,
    "Доставка по России",
  ];

  return (
    <>
      <Hero samples={samples} nextId="season" />

      {/* сезон: тёмная секция продолжает затемнение hero */}
      <Season id="season" items={seasonItems} />

      {/* калькулятор нестандарта */}
      <SectionReveal variant="seam" id="calc" className="flex min-h-[100svh] flex-col justify-center bg-tarp px-4 py-20 text-paper md:px-[4vw] md:py-24">
        <div className="w-full">
          <SplitReveal text="Нет нужного размера? Сошьём" className="mb-10 text-[clamp(3.6rem,8vw,10rem)] leading-[0.95]" />
          <CustomCalc
            products={all
              .filter((p) => p.category !== "fabric")
              .map(({ slug, title, kind, colors, options, pricePerM2ByOption, pricePerM2Median }) => ({
                slug,
                title,
                kind,
                colors,
                options,
                pricePerM2ByOption,
                pricePerM2Median,
              }))}
          />
        </div>
      </SectionReveal>

      {/* две «стропы» крест-накрест */}
      <div className="relative z-10 -mt-6 overflow-x-clip pt-8 pb-10" aria-hidden>
        <Marquee className="relative z-10 -mx-4 -rotate-2 bg-strap py-3 text-ink shadow-lg" duration={45}>
          {strapItems.map((t) => (
            <span key={t} className="flex items-center gap-6 px-6 font-display text-3xl font-extrabold whitespace-nowrap md:text-4xl">
              {t}
              <span className="grommet border-ink/70" />
            </span>
          ))}
        </Marquee>
        <Marquee reverse className="-mx-4 -mt-9 rotate-2 bg-tarp py-2.5 text-paper/90" duration={60}>
          {categories.map((c) => (
            <span key={c.id} className="flex items-center gap-6 px-6 text-lg whitespace-nowrap">
              {c.title}
              <span className="seam w-10 text-paper/40" />
            </span>
          ))}
        </Marquee>
      </div>

      {/* заставка: фото склада и огромный «хромовый» текст */}
      <BigStatement
        image="/process/warehouse.webp"
        lines={["Как мы шьем", "ваш заказ"]}
        sub={`Цех ${site.workshopArea}, ${site.dailyOutput}. Шесть этапов — от рулона до отгрузки.`}
      />

      {/* этапы: панели быстро уезжают вправо */}
      <ProcessChapter steps={STEPS.map((x) => ({ title: x.t, text: x.d, image: x.img }))} />

      {/* поворот лабиринта: вниз — крупная фраза */}
      <section className="bg-chalk py-28 text-center md:py-44">
        <div className="wrap">
          <SplitReveal
            text="Любой размер"
            className="font-manrope text-[14vw] leading-[0.9] font-normal tracking-[-0.03em] uppercase md:text-[10vw]"
          />
          <SplitReveal
            text={`за ${site.productionDays}`}
            className="font-manrope text-[9vw] leading-[0.95] font-normal tracking-[-0.03em] text-ink-soft uppercase md:text-[6.5vw]"
          />
          <p className="font-jost mx-auto mt-8 max-w-[44ch] text-xl text-ink-soft md:text-2xl">
            Нет нужного размера в каталоге — сошьём по вашим замерам, без посредников и наценок маркетплейса.
          </p>
        </div>
      </section>

      {/* материалы: панели во весь экран */}
      <MaterialsChapter
        items={compare.map((m) => ({
          id: m.id,
          title: m.title,
          density: m.spec.density,
          text: m.text,
          perM2: formatPrice(m.perM2),
          image: MATERIAL_PHOTO[m.id],
          traits: m.traits,
        }))}
      />



      {/* вопросы */}
      <SectionReveal variant="curtain" className="wrap py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.4fr]">
          <SplitReveal text="Частые вопросы" className="text-[clamp(3.6rem,7.5vw,9rem)] leading-[0.95]" />
          <Faq />
        </div>
      </SectionReveal>

      {/* финальный призыв */}
      <SectionReveal variant="unroll" className="wrap py-20 md:py-28">
          <div>
            <SplitReveal text={`Пришлите размеры — посчитаем за ${site.responseTime}`} className="max-w-[19ch] text-[clamp(4rem,10vw,12rem)] leading-[0.95]" />
            <p className="mt-6 max-w-[46ch] text-xl md:text-2xl">
              Напишите в Telegram, позвоните или соберите заявку в каталоге.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <a href={site.telegram} target="_blank" rel="noopener" className="btn btn-ink min-h-16 px-7 text-lg md:min-h-20 md:px-10 md:text-2xl">
                <Send className="size-6" aria-hidden /> Написать в Telegram
              </a>
              <a href={site.phoneHref} className="btn btn-ghost min-h-16 px-7 text-lg md:min-h-20 md:px-10 md:text-2xl">
                <Phone className="size-6" aria-hidden /> {site.phone}
              </a>
            </div>
          </div>
      </SectionReveal>
    </>
  );
}


