"use client";

// Основано на компоненте 21st.dev «Page Transition» (su2491251), вариант double-stairs:
// 5 полос ткани разъезжаются вверх и вниз, открывая новую страницу.
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const COLUMNS = 5;
const STRIPES = ["#28331f", "#33402a", "#f4b400", "#33402a", "#28331f"];

const variants: Variants = {
  cover: { y: "0%" },
  exit: (i: number) => ({
    y: i % 2 === 0 ? "-100%" : "100%",
    transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: 0.05 + i * 0.05 },
  }),
};

// Адрес, на котором «ступени» показывались в прошлый раз. Пишется только в эффекте,
// поэтому на сервере всегда null: первая загрузка и гидратация рисуют одно и то же — ничего.
let lastPath: string | null = null;

export function StairsTransition() {
  const reduce = useReducedMotion();
  const path = usePathname();
  // Показываем только при настоящем переходе: прошлый адрес известен и отличается от текущего
  const [show] = useState(() => lastPath !== null && lastPath !== path);
  const [done, setDone] = useState(false);

  useEffect(() => {
    lastPath = path;
  }, [path]);

  if (!show || done || reduce) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex" aria-hidden>
      {STRIPES.slice(0, COLUMNS).map((c, i) => (
        <motion.div
          key={i}
          custom={i}
          variants={variants}
          initial="cover"
          animate="exit"
          onAnimationComplete={() => i === COLUMNS - 1 && setDone(true)}
          className="h-full flex-1"
          style={{ background: c }}
        />
      ))}
    </div>
  );
}
