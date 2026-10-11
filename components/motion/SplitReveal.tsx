"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

/**
 * Заголовок по буквам (приём Codrops «On-Scroll Letter Animations»):
 * когда заголовок попадает в экран, буквы выезжают снизу из-под маски с небольшим наклоном.
 */
export function SplitReveal({ text, className, as = "h2" }: { text: string; className?: string; as?: "h2" | "h3" }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduce = useReducedMotion();
  const Tag = as;
  let n = 0;

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {text.split(" ").map((word, wi) => (
        <span key={wi} aria-hidden className="mr-[0.22em] inline-flex overflow-hidden pb-[0.08em] align-bottom last:mr-0">
          {[...word].map((ch) => {
            const i = n++;
            return (
              <motion.span
                key={i}
                className="inline-block"
                initial={reduce ? false : { y: "110%", rotate: 8 }}
                animate={inView || reduce ? { y: "0%", rotate: 0 } : undefined}
                transition={{ duration: 0.75, delay: i * 0.025, ease: [0.22, 1, 0.36, 1] }}
              >
                {ch}
              </motion.span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}
