"use client";
/* eslint-disable react/display-name -- панели передаются как функции отрисовки, а не компоненты */

import { motion, useInView, useMotionValueEvent, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PanelChapter, PanelImage, type PanelArgs } from "@/components/motion/PanelChapter";

export type ProcessStep = { title: string; text: string; image: string };

/** Огромный контурный номер этапа: сдвигается вместе с прокруткой */
function StepNumber({ n, p }: { n: number; p: PanelArgs }) {
  const step = 1 / Math.max(1, p.total - 1);
  const x = useTransform(p.progress, [(p.index - 1) * step, (p.index + 1) * step], ["30%", "-30%"]);
  return (
    <motion.span
      style={{ x, WebkitTextStroke: "2px rgb(244 180 0 / 0.85)" }}
      className="pointer-events-none absolute right-[4vw] bottom-[6vh] font-manrope text-[34vw] leading-none font-normal text-transparent md:text-[24vw]"
      aria-hidden
    >
      {String(n).padStart(2, "0")}
    </motion.span>
  );
}

/**
 * Этапы производства: полноэкранные панели уезжают влево.
 * Фото — фоном во весь экран, поверх — огромное название этапа и одна строка текста.
 */
export function ProcessChapter({ steps }: { steps: ProcessStep[] }) {
  return (
    <PanelChapter
      className="bg-ink text-paper"
      speed={0.55}
      panels={steps.map((s, i) => (p: PanelArgs) => (
        <div className="relative h-full">
          <PanelImage src={s.image} alt={s.title} progress={p.progress} index={p.index} total={p.total} className="absolute inset-0" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,20,15,.88)_0%,rgba(16,20,15,.55)_55%,rgba(16,20,15,.35)_100%)]" />
          <StepNumber n={i + 1} p={p} />
          <div className="relative flex h-full flex-col justify-center px-6 md:px-[6vw]">
            <span className="font-jost text-lg text-strap md:text-xl">
              Этап {i + 1} из {steps.length}
            </span>
            <h3 className="mt-3 font-manrope text-[12vw] leading-[0.9] font-normal tracking-[-0.03em] uppercase md:text-[8.5vw]">
              {s.title}
            </h3>
            <p className="font-jost mt-6 max-w-[34ch] text-xl text-paper/85 md:text-[1.7rem] md:leading-snug">{s.text}</p>
          </div>
        </div>
      ))}
    />
  );
}

export type MaterialPanel = {
  id: string;
  title: string;
  density: string;
  text: string;
  perM2: string;
  image: string;
  traits: [string, number][];
};

// Слои перед фото: цвета бренда, как во вступлении (Codrops RapidLayers)
const REVEAL_LAYERS = ["bg-strap", "bg-tarp"];
const EASE_IN_OUT: [number, number, number, number] = [0.45, 0, 0.55, 1];

/**
 * Фото материала появляется слоями, как вступление сайта: жёлтый и зелёный слои
 * и само фото по очереди выезжают снизу, а картинка внутри каждого слоя едет навстречу.
 * Анимация запускается, когда панель становится активной и видна на экране; при возврате — повторяется.
 */
function MaterialPhoto({ material, panel, className }: { material: MaterialPanel; panel: PanelArgs; className?: string }) {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { amount: 0.4 });
  const [active, setActive] = useState(panel.index === 0);
  useMotionValueEvent(panel.progress, "change", (v) => {
    setActive(Math.abs(v * (panel.total - 1) - panel.index) < 0.45);
  });
  const shown = reduce || (active && inView);

  const layers = [...REVEAL_LAYERS.map((c) => ({ key: c, color: c })), { key: "photo", color: "bg-white" }];
  return (
    <div ref={box} className={`overflow-hidden ${className ?? ""}`}>
      {layers.map((l, i) => (
        <motion.div
          key={l.key}
          className={`absolute inset-0 overflow-hidden ${l.color}`}
          initial={false}
          animate={shown ? { y: "0%" } : { y: "101%" }}
          transition={shown ? { duration: 1.05, delay: i * 0.16, ease: EASE_IN_OUT } : { duration: 0.35, ease: "easeIn" }}
        >
          <motion.div
            className="absolute inset-0"
            initial={false}
            animate={shown ? { y: "0%" } : { y: "-101%" }}
            transition={shown ? { duration: 1.05, delay: i * 0.16, ease: EASE_IN_OUT } : { duration: 0.35, ease: "easeIn" }}
          >
            {l.key === "photo" && (
              <motion.img
                src={material.image}
                alt={material.title}
                className="h-full w-full object-cover"
                loading="lazy"
                initial={false}
                animate={shown ? { scale: 1 } : { scale: 1.18 }}
                transition={{ duration: 1.4, delay: shown ? i * 0.16 : 0, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Название материала: на десктопе кегль подбирается так, чтобы слово тянулось от левого поля
 * до 80% ширины экрана и последними буквами заходило на фото (фото начинается с 64%).
 */
function FitTitle({ text }: { text: string }) {
  const probe = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<number | null>(null);
  useEffect(() => {
    const fit = () => {
      if (!probe.current) return;
      if (window.innerWidth < 768) return setSize(null);
      const w = probe.current.getBoundingClientRect().width;
      // не крупнее 15vw: короткие слова (ПВХ) не раздуваются по высоте
      if (w) setSize(Math.min(((window.innerWidth * 0.8 - window.innerWidth * 0.05) / w) * 100, window.innerWidth * 0.15));
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const cls = "font-manrope leading-[0.82] font-normal tracking-[-0.04em] uppercase whitespace-nowrap";
  const style = size ? { fontSize: `${size}px` } : undefined;
  return (
    <div className="relative mt-2 md:-ml-[5vw] md:w-screen md:pr-[20vw] md:pl-[5vw] md:text-right">
      <span ref={probe} aria-hidden className={`${cls} pointer-events-none invisible absolute top-0 left-0 text-[100px]`}>
        {text}
      </span>
      <h2 className={`${cls} text-[15.5vw] text-ink md:text-[12vw]`} style={style}>
        {text}
      </h2>
      {/* цветная копия (бирюза логотипа) видна только поверх фото: обрезка по 64% ширины экрана */}
      <span
        aria-hidden
        className={`${cls} pointer-events-none absolute inset-0 hidden text-[15.5vw] text-[#00b8cc] md:block md:pr-[20vw] md:pl-[5vw] md:text-right md:text-[12vw]`}
        style={{ ...style, clipPath: "inset(0 0 0 64%)" }}
      >
        {text}
      </span>
    </div>
  );
}

/** Характеристика в виде «стата» из игры: подпись, 5 крупных сегментов и оценка цифрой */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 md:py-3.5">
      <dt className="font-jost text-lg md:text-xl">{label}</dt>
      <dd className="flex items-center gap-3">
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: 5 }, (_, j) => (
            <span key={j} className={`h-3.5 w-6 -skew-x-12 rounded-[3px] md:h-4 md:w-8 ${j < value ? "bg-tarp" : "bg-line"}`} />
          ))}
        </span>
        <span className="w-10 text-right font-display text-2xl leading-none font-extrabold tabular-nums md:text-3xl">
          {value}
          <span className="text-base text-ink-soft">/5</span>
        </span>
      </dd>
    </div>
  );
}

/**
 * Материалы: фото занимает правую треть панели во всю высоту, огромное название
 * заходит на фото последними буквами — на фото они светлые (дубликат текста с обрезкой по краю фото).
 */
export function MaterialsChapter({ items }: { items: MaterialPanel[] }) {
  return (
    <PanelChapter
      className="bg-paper"
      speed={0.55}
      panels={items.map((m, i) => (p: PanelArgs) => (
        <div className="relative h-full">
          {/* фото: на телефоне — полоса сверху, на десктопе — правая треть во всю высоту */}
          <MaterialPhoto material={m} panel={p} className="absolute inset-x-0 top-16 h-[26vh] md:inset-y-0 md:top-0 md:right-0 md:left-auto md:h-full md:w-[36%]" />

          <div className="relative flex h-full flex-col px-6 pt-[calc(26vh+5rem)] pb-8 md:w-[64%] md:px-[5vw] md:pt-28 md:pb-10">
            <span className="font-jost text-lg text-ink-soft md:text-xl">
              Материал {i + 1} из {items.length} · {m.density}
            </span>

            <FitTitle text={m.title} />

            <p className="font-jost mt-5 max-w-[40ch] text-xl leading-snug md:text-[clamp(1.35rem,1.8vw,2.1rem)]">{m.text}</p>

            <dl className="mt-6 grid max-w-3xl gap-x-10 md:grid-cols-2">
              {m.traits.map(([k, v]) => (
                <Stat key={k} label={k} value={v} />
              ))}
            </dl>

            <div className="mt-auto flex flex-wrap items-center gap-4 pt-6">
              <span className="font-display text-4xl font-extrabold">от {m.perM2} за м²</span>
              <Link href={`/catalog?mat=${m.id}`} className="btn btn-ink min-h-14 px-7 text-lg">
                Изделия <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      ))}
    />
  );
}
