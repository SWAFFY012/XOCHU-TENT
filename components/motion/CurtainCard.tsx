"use client";

// Основано на компоненте 21st.dev «Card Curtain Reveal» (youcefbnm):
// при наведении «шторка» раскрывается от центра и показывает описание.
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useMediaQuery } from "@/lib/hooks";

const curtain: Variants = {
  open: {
    clipPath: "polygon(0 0,100% 0,100% 100%,0 100%)",
    transition: { duration: 0.45, ease: [0.25, 1.3, 0.5, 1] },
  },
  closed: {
    clipPath: "polygon(50% 0,50% 0,50% 100%,50% 100%)",
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

type Props = {
  href: string;
  title: string;
  lead: string;
  meta: string;
  art: ReactNode;
  className?: string;
};

export function CurtainCard({ href, title, lead, meta, art, className }: Props) {
  const [hover, setHover] = useState(false);
  // На тач-экранах наведения нет — описание открыто сразу
  const touch = useMediaQuery("(hover: none)");

  const open = hover || touch;

  return (
    <Link
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className={`group relative flex min-h-[22rem] flex-col overflow-hidden rounded-[28px] bg-tarp text-paper ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute -right-12 -bottom-8 aspect-[3/4] h-[66%] opacity-50 transition-transform sm:h-[88%] sm:opacity-90 duration-500 ease-out group-hover:-translate-y-2 group-hover:rotate-[-3deg]">
        {art}
      </div>
      <div className="relative z-10 flex flex-1 flex-col p-6">
        <span className="text-sm text-paper/70">{meta}</span>
        <motion.h3
          className="mt-auto max-w-[12ch] text-[2.6rem] leading-[0.9] md:text-5xl"
          animate={open ? { y: 0 } : { y: 34 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {title}
        </motion.h3>
        <motion.p
          className="mt-3 max-w-[30ch] text-[0.95rem] leading-snug text-paper/85"
          variants={curtain}
          initial={false}
          animate={open ? "open" : "closed"}
        >
          {lead}
        </motion.p>
      </div>
      {/* шторка: инвертирует цвета под собой */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-strap mix-blend-difference"
        variants={curtain}
        initial={false}
        animate={hover && !touch ? "open" : "closed"}
        style={{ opacity: 0.12 }}
      />
    </Link>
  );
}
