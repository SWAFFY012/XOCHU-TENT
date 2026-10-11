"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * Экран-заставка как «Акции и спецпредложения» на icondetailing:
 * фото во весь экран медленно приближается, поверх — огромный текст с переливом «хрома».
 */
export function BigStatement({ image, lines, sub }: { image: string; lines: string[]; sub?: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.25, 1]);
  const y = useTransform(scrollYProgress, [0, 1], ["8%", "-8%"]);

  return (
    <section ref={ref} className="relative isolate flex h-[100svh] min-h-[640px] items-center justify-center overflow-hidden bg-ink">
      <motion.div className="absolute inset-0 -z-10" style={reduce ? undefined : { scale }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,20,15,.35)_0%,rgba(16,20,15,.8)_75%)]" />
      </motion.div>

      <motion.div className="px-4 text-center" style={reduce ? undefined : { y }}>
        <h2 className="font-manrope leading-[0.92] font-normal tracking-[-0.02em] uppercase" aria-label={lines.join(" ").replace(/шьем/i, "шьём")}>
          {lines.map((l) => (
            <span key={l} className="chrome-text block text-[10.5vw] md:text-[9vw]">
              {l}
            </span>
          ))}
        </h2>
        {sub && <p className="font-jost mx-auto mt-6 max-w-[40ch] text-xl text-paper/80 md:text-2xl">{sub}</p>}
      </motion.div>
    </section>
  );
}
