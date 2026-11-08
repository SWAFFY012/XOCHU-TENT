"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { TIME_STEPS, YM_ID, reachGoal, timeGoal, type Goal, type TimeSection } from "@/lib/metrika";

/**
 * Сколько человек провёл в важных разделах: «О производстве», каталог (список и карточки) и корзина.
 * Считаем только активное время: вкладка видна и за последние 60 секунд были движения мыши,
 * прокрутка, касание или ввод. Забытая открытая вкладка цели не дают.
 * Время копится по разделу за весь визит (переходы внутри каталога складываются), каждая цель уходит один раз.
 */
function sectionOf(path: string): TimeSection | null {
  if (path === "/about") return "about";
  if (path === "/catalog" || path.startsWith("/catalog/")) return "catalog";
  if (path === "/cart") return "cart";
  return null;
}

const IDLE_MS = 60_000;
const ACTIVITY = ["pointermove", "pointerdown", "keydown", "scroll", "wheel", "touchstart"] as const;

// Накопленные секунды и отправленные цели живут, пока открыта вкладка
const spent = new Map<TimeSection, number>();
const fired = new Set<Goal>();

export function PageTimeTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!YM_ID) return;
    const section = sectionOf(pathname);
    if (!section) return;

    let last = Date.now();
    const touch = () => {
      last = Date.now();
    };
    ACTIVITY.forEach((e) => window.addEventListener(e, touch, { passive: true, capture: true }));

    const timer = window.setInterval(() => {
      if (document.hidden || Date.now() - last > IDLE_MS) return;
      const total = (spent.get(section) ?? 0) + 1;
      spent.set(section, total);
      for (const sec of TIME_STEPS[section]) {
        const goal = timeGoal(section, sec);
        if (total >= sec && !fired.has(goal)) {
          fired.add(goal);
          reachGoal(goal, { seconds: sec });
        }
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
      ACTIVITY.forEach((e) => window.removeEventListener(e, touch, { capture: true }));
    };
  }, [pathname]);

  return null;
}
