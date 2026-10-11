"use client";
/* eslint-disable react/display-name -- панели передаются как функции отрисовки, а не компоненты */

import { motion, useInView, useMotionValueEvent, useReducedMotion, useTransform } from "framer-motion";
import { useRef, useState } from "react";
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
function MaterialPhoto({ material, panel }: { material: MaterialPanel; panel: PanelArgs }) {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { amount: 0.4 });
  const [active, setActive] = useState(panel.index === 0);
  useMotionValueEvent(panel.progress, "change", (v) => {
    setActive(Math.abs(v * (panel.total - 1) - panel.index) < 0.45);
  });
  const step = 1 / Math.max(1, panel.total - 1);
  const at = panel.index * step;
  const y = useTransform(panel.progress, [at - step, at + step], [14, -14]);
  const shown = reduce || (active && inView);

  const layers = [...REVEAL_LAYERS.map((c) => ({ key: c, color: c })), { key: "photo", color: "bg-white" }];
  return (
    <motion.div ref={box} style={reduce ? undefined : { y }} className="relative h-[24vh] w-full overflow-hidden rounded-[24px] md:h-[40vh]">
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
    </motion.div>
  );
}

/** Материалы: огромное название на всю ширину, фото, минимум текста */
export function MaterialsChapter({ items }: { items: MaterialPanel[] }) {
  return (
    <PanelChapter
      className="bg-paper"
      speed={0.55}
      panels={items.map((m, i) => (p: PanelArgs) => (
        <div className="relative flex h-full flex-col justify-between px-6 pt-24 pb-8 md:px-[5vw] md:pt-28 md:pb-12">
          <div className="flex items-start justify-between gap-6">
            <span className="font-jost text-lg text-ink-soft md:text-xl">
              Материал {i + 1} из {items.length}
            </span>
            <span className="font-jost text-lg text-ink-soft md:text-xl">{m.density}</span>
          </div>

          <div className="grid items-end gap-6 md:grid-cols-[1.1fr_1fr]">
            <h2 className="font-manrope text-[15.5vw] leading-[0.82] font-normal tracking-[-0.04em] uppercase md:col-span-2 md:text-[14vw]">{m.title}</h2>
            <div>
              <p className="font-jost max-w-[40ch] text-xl leading-snug md:text-[clamp(1.5rem,2vw,2.5rem)]">{m.text}</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
                {m.traits.map(([k, v]) => (
                  <span key={k} className="font-jost flex items-center gap-2 text-base text-ink-soft md:text-xl">
                    {k}
                    <span className="flex gap-0.5" aria-label={`${v} из 5`}>
                      {Array.from({ length: 5 }, (_, j) => (
                        <span key={j} className={`h-2 w-3 rounded-full ${j < v ? "bg-tarp" : "bg-line"}`} />
                      ))}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-start gap-4 md:items-end">
              <MaterialPhoto material={m} panel={p} />
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-display text-4xl font-extrabold">от {m.perM2} за м²</span>
                <Link href={`/catalog?mat=${m.id}`} className="btn btn-ink min-h-16 px-7 text-lg">
                  Изделия <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}
    />
  );
}
