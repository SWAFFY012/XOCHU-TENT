"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, Star } from "lucide-react";
import { site } from "@/lib/site";
import { RapidLayersIntro } from "@/components/motion/RapidLayersIntro";
import { useMediaQuery } from "@/lib/hooks";

export type HeroSample = { title: string; size: string; price: string; href: string };

// В огромном кегле точки «Ё» висят отдельно — визуально пишем «Е», для поиска и экранных дикторов — sr-only с «ё»
const LINES = ["Утепленные шторы", "и тенты на заказ"];
// На телефоне — четыре короткие строки: кегль в полтора раза крупнее
const LINES_MOBILE = ["Утепленные", "шторы", "и тенты", "на заказ"];
// Match the intro still; skip only the source video's opening black/fade frames.
const VIDEO_START = 0.6;

export function Hero({ samples, nextId }: { samples: HeroSample[]; nextId: string }) {
  const ref = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [introReady, setIntroReady] = useState(false);
  const revealHero = useCallback(() => setIntroReady(true), []);
  const started = useRef(false);
  const playHero = useCallback(() => {
    if (!video.current) return;
    started.current = true;
    video.current.currentTime = VIDEO_START;
    void video.current.play().catch(() => undefined);
  }, []);

  // Видео не крутится, когда первый экран ушёл из вида: меньше нагрузки при прокрутке
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      const v = video.current;
      if (!v || !started.current) return;
      if (e.isIntersecting) void v.play().catch(() => undefined);
      else v.pause();
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Как на icondetailing: при прокрутке первого экрана видео приближается до 1.85, текст уходит
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.85]);
  const shade = useTransform(scrollYProgress, [0, 0.85], [0, 1]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const fade = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  useEffect(() => {
    if (reduce || !introReady) return;
    const t = setInterval(() => setI((x) => (x + 1) % samples.length), 2600);
    return () => clearInterval(t);
  }, [samples.length, reduce, introReady]);

  const s = samples[i];

  return (
    <>
    <RapidLayersIntro onReveal={revealHero} onComplete={playHero} />
    <section ref={ref} className="hero-scale relative isolate flex min-h-[100svh] items-end overflow-hidden bg-tarp text-paper">
      <motion.div className="absolute inset-0 -z-10" style={reduce ? undefined : { scale: videoScale }}>
        <video ref={video} onLoadedMetadata={(event) => { event.currentTarget.currentTime = VIDEO_START; }} className="h-full w-full object-cover" muted loop playsInline preload="auto" poster="/intro/video-start-1920.webp" aria-hidden>
          <source src="/hero-720.mp4" type="video/mp4" media="(max-width: 767px)" />
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,27,21,.55)_0%,rgba(22,27,21,.2)_35%,rgba(22,27,21,.85)_100%)]" />
      </motion.div>
      {/* затемнение растёт по мере прокрутки — переход в следующую секцию */}
      <motion.div className="pointer-events-none absolute inset-0 -z-10 bg-ink" style={reduce ? { opacity: 0 } : { opacity: shade }} />

      <motion.div className="wrap pt-24 pb-10 md:pt-28 md:pb-28 md:[@media(max-height:820px)]:pb-20" style={reduce ? undefined : { y: textY, opacity: fade }}>
        <HeroTitle reduce={!!reduce} ready={introReady} />

        <p className="font-jost mt-4 text-[0.95rem] leading-snug text-paper/85 md:mt-5 md:text-[length:calc(1.45rem*var(--hero-k,1))] md:text-paper/90">
          <span className="hidden md:inline">
            Сезонные хиты к зиме: утеплённые шторы для гаражей и складов, ПВХ-тенты, брезентовые шторы.
            <br />
          </span>
          Своё производство под Петербургом — шьём любые размеры за {site.productionDays}.
        </p>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 md:mt-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-6">
          <div className="min-w-0">
            {/* живая «размерная лента»: сезонные товары с реальными ценами из прайса */}
            <Link
              href={s.href}
              className="flex w-fit max-w-full items-center gap-3 overflow-hidden rounded-2xl border border-paper/15 bg-paper/12 py-2 pr-4 pl-2 backdrop-blur-md hover:bg-paper/18 md:gap-4 md:py-2.5 md:pr-5 md:pl-2.5"
            >
              <span className="relative shrink-0 overflow-hidden rounded-xl bg-strap px-3 py-1.5 font-display text-[1.5rem] md:px-3.5 md:py-2 md:text-[length:calc(2rem*var(--hero-k,1))] leading-none font-extrabold whitespace-nowrap text-ink">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={s.size + s.title}
                    className="block"
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "-110%" }}
                    transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
                  >
                    {s.size}
                  </motion.span>
                </AnimatePresence>
              </span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={s.title + s.size}
                  className="min-w-0 truncate text-[0.95rem] md:text-lg"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                >
                  {s.title} — <b className="font-semibold">{s.price}</b>
                </motion.span>
              </AnimatePresence>
            </Link>

            <div className="mt-4 flex gap-2.5 md:mt-6 md:flex-wrap md:gap-3">
              <Link href="/catalog?cat=curtains" className="btn btn-strap min-h-12 flex-1 px-4 text-base md:min-h-14 md:flex-none md:px-8 md:text-lg">
                Утеплённые шторы
              </Link>
              <Link href="/#calc" className="btn btn-ghost min-h-12 flex-1 px-4 text-base md:min-h-14 md:flex-none md:px-8 md:text-lg">
                <span className="md:hidden">Свой размер</span>
                <span className="hidden md:inline">Рассчитать свой размер</span>
              </Link>
            </div>
          </div>

          <a
            href={site.ozon}
            target="_blank"
            rel="noopener"
            className="flex w-fit items-center gap-4 rounded-2xl border border-paper/25 bg-paper/10 px-4 py-2.5 backdrop-blur-md hover:border-paper/45 md:gap-5 md:rounded-3xl md:px-6 md:py-5"
          >
            <span className="flex items-center gap-2 font-display text-4xl font-extrabold md:text-6xl">
              <Star className="size-6 fill-strap text-strap md:size-9" aria-hidden />
              {site.ozonStats.rating}
            </span>
            <span className="text-sm leading-snug text-paper/85 md:text-base">
              {site.ozonStats.reviews} отзывов
              <br />
              {site.ozonStats.orders} заказов на Ozon
            </span>
          </a>
        </div>
      </motion.div>

      {/* стрелка вниз: плавно ведёт к следующей секции */}
      <motion.a
        href={`#${nextId}`}
        aria-label="К следующему разделу"
        className="absolute bottom-3 left-1/2 hidden size-16 -translate-x-1/2 place-items-center text-paper hover:text-strap md:bottom-5 md:grid"
        style={reduce ? undefined : { opacity: fade }}
      >
        <motion.span
          animate={reduce ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="size-10 md:size-12" strokeWidth={1.5} />
        </motion.span>
      </motion.a>
    </section>
    </>
  );
}

/**
 * Заголовок как у icondetailing: строки набраны так, чтобы самая длинная занимала всю ширину.
 * Буквы проявляются из размытия по очереди, по тексту идёт мягкий блик.
 * Раз в 10 секунд заголовок плавно гаснет и проявляется снова.
 */
function HeroTitle({ reduce, ready }: { reduce: boolean; ready: boolean }) {
  const [cycle, setCycle] = useState(0);
  const box = useRef<HTMLHeadingElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<number | null>(null);
  const lines = useMediaQuery("(max-width: 767px)") ? LINES_MOBILE : LINES;

  useEffect(() => {
    if (reduce || !ready) return;
    const t = setInterval(() => setCycle((c) => c + 1), 10000);
    return () => clearInterval(t);
  }, [reduce, ready]);

  // Кегль: ширина самой длинной строки при 100px -> размер под ширину контейнера
  useEffect(() => {
    const fit = () => {
      if (!box.current || !probe.current) return;
      const w = Math.max(...[...probe.current.children].map((c) => c.getBoundingClientRect().width));
      if (w) setSize((box.current.clientWidth / w) * 100);
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [lines]);

  let n = 0;
  return (
    <h1
      ref={box}
      className="relative font-manrope leading-[0.95] font-normal tracking-[-0.02em] whitespace-nowrap uppercase"
      style={{ fontSize: size ? `${size}px` : "8.5vw" }}
    >
      <span className="sr-only">Утеплённые шторы и тенты на заказ от производителя «Хочу Тент»</span>
      {/* невидимые образцы для замера ширины строк */}
      <span ref={probe} aria-hidden className="pointer-events-none invisible absolute top-0 left-0 text-[100px] tracking-[-0.02em]">
        {lines.map((l) => (
          <span key={l} className="block w-max">
            {l}
          </span>
        ))}
      </span>
      <span aria-hidden key={cycle} className="block">
        {lines.map((line) => (
          <span key={line} className="block">
            {[...line].map((ch) => {
              const k = n++;
              return (
                <motion.span
                  key={k}
                  className="hero-shine inline-block"
                  initial={reduce ? false : { opacity: 0, filter: "blur(16px)", y: "0.15em" }}
                  animate={ready || reduce ? { opacity: 1, filter: "blur(0px)", y: 0 } : { opacity: 0, filter: "blur(16px)", y: "0.15em" }}
                  transition={{ duration: 1, delay: 0.035 * k, ease: [0.25, 1, 0.5, 1] }}
                >
                  {ch === " " ? " " : ch}
                </motion.span>
              );
            })}
          </span>
        ))}
      </span>
    </h1>
  );
}
