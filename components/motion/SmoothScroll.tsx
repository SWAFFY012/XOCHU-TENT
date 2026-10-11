"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Плавная инерционная прокрутка (Lenis) для всего сайта.
 * Останавливается, когда открыто меню, шторка товара или фильтры (body overflow: hidden).
 * Вложенные прокручиваемые блоки помечаются data-lenis-prevent.
 */
export function SmoothScroll() {
  const lenis = useRef<Lenis | null>(null);
  const path = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const l = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: { offset: -80 } });
    lenis.current = l;
    let id = 0;
    const raf = (t: number) => {
      const locked = document.body.style.overflow === "hidden";
      if (locked && !l.isStopped) l.stop();
      if (!locked && l.isStopped) l.start();
      l.raf(t);
      id = requestAnimationFrame(raf);
    };
    id = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(id);
      l.destroy();
      lenis.current = null;
    };
  }, []);

  // Новая страница — наверх без инерции
  useEffect(() => {
    lenis.current?.scrollTo(0, { immediate: true });
  }, [path]);

  return null;
}
