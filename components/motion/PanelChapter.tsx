"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Горизонтальная глава как на icondetailing.ru: секция закрепляется,
 * а полноэкранные панели целиком уезжают влево, пока человек прокручивает вниз.
 * speed > 1 — прокрутка дольше, движение спокойнее.
 */
export type PanelArgs = { progress: MotionValue<number>; index: number; total: number };

export function PanelChapter({
  panels,
  speed = 1.4,
  className,
}: {
  panels: ((p: PanelArgs) => ReactNode)[];
  speed?: number;
  className?: string;
}) {
  const section = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [vw, setVw] = useState(0);

  useLayoutEffect(() => {
    const m = () => setVw(window.innerWidth);
    m();
    window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, []);

  const distance = vw * (panels.length - 1);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 32, mass: 0.35 });
  const x = useTransform(smooth, [0, 1], [0, -distance]);

  if (reduce) {
    return (
      <section className={className}>
        {panels.map((render, index) => (
          <div key={index} className="min-h-screen">
            {render({ progress: scrollYProgress, index, total: panels.length })}
          </div>
        ))}
      </section>
    );
  }

  return (
    <section ref={section} className={className} style={{ height: `calc(100vh + ${distance * speed}px)` }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div style={{ x }} className="flex h-full w-max will-change-transform">
          {panels.map((render, index) => (
            <div key={index} className="relative h-full w-screen shrink-0 overflow-hidden">
              {render({ progress: smooth, index, total: panels.length })}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Картинка панели (приём Codrops «image reveal»): раскрывается шторкой справа налево,
 * пока панель въезжает, и одновременно уменьшается с 1.3 до 1.
 */
export function PanelImage({
  src,
  alt,
  progress,
  index,
  total,
  className,
  zoom = 1.3,
}: {
  src: string;
  alt: string;
  progress: MotionValue<number>;
  index: number;
  total: number;
  className?: string;
  zoom?: number;
}) {
  const reduce = useReducedMotion();
  const step = total > 1 ? 1 / (total - 1) : 1;
  const at = index * step;
  // Первая панель уже на экране — её показываем сразу
  const from = index === 0 ? -1 : at - step;
  const clip = useTransform(progress, [from, at], ["inset(0% 0% 0% 100%)", "inset(0% 0% 0% 0%)"]);
  const scale = useTransform(progress, [from, at + step * 0.5], [zoom, 1]);
  return (
    <motion.div style={reduce ? undefined : { clipPath: clip }} className={`overflow-hidden ${className ?? ""}`}>
      <motion.img src={src} alt={alt} style={reduce ? undefined : { scale }} className="h-full w-full object-cover" loading="lazy" />
    </motion.div>
  );
}
