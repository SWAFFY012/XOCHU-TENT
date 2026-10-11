"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef, type ReactNode } from "react";

export type RevealVariant = "curtain" | "unroll" | "seam" | "lift";

type Props = {
  children: ReactNode;
  variant?: RevealVariant;
  className?: string;
  id?: string;
  as?: "section" | "div";
};

/**
 * Переход секции при прокрутке. Секция «открывается», пока её верх едет
 * от низа экрана к трети высоты:
 * - curtain — шторы раздвигаются от центра;
 * - unroll  — рулон раскатывается сверху вниз;
 * - seam    — диагональный шов прорезает секцию;
 * - lift    — секция поднимается и выпрямляется, как натянутый тент.
 */
export function SectionReveal({ children, variant = "curtain", className, id, as = "section" }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.3"] });
  const p = useTransform(scrollYProgress, [0, 1], [0, 1], { clamp: true });
  const style = useVariantStyle(variant, p);
  const Tag = as === "div" ? motion.div : motion.section;

  return (
    <Tag ref={ref as never} id={id} className={className} style={reduce ? undefined : style}>
      {children}
    </Tag>
  );
}

function useVariantStyle(variant: RevealVariant, p: MotionValue<number>) {
  const curtain = useTransform(p, (v) => {
    const side = (1 - ease(v)) * 22;
    const r = (1 - ease(v)) * 48;
    return `inset(0% ${side}% 0% ${side}% round ${r}px ${r}px 0 0)`;
  });
  const unroll = useTransform(p, (v) => `inset(0% 0% ${(1 - ease(v)) * 55}% 0% round 0 0 ${(1 - ease(v)) * 60}px ${(1 - ease(v)) * 60}px)`);
  const seam = useTransform(p, (v) => {
    const t = (1 - ease(v)) * 30;
    return `polygon(0% ${t}%, 100% 0%, 100% 100%, 0% 100%)`;
  });
  const liftY = useTransform(p, [0, 1], [90, 0]);
  const liftR = useTransform(p, [0, 1], [-2.2, 0]);
  const liftS = useTransform(p, [0, 1], [0.94, 1]);

  switch (variant) {
    case "curtain":
      return { clipPath: curtain };
    case "unroll":
      return { clipPath: unroll };
    case "seam":
      return { clipPath: seam };
    case "lift":
      return { y: liftY, rotate: liftR, scale: liftS, transformOrigin: "50% 100%" };
  }
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
