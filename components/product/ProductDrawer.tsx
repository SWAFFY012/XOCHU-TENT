"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useMediaQuery } from "@/lib/hooks";

/**
 * Карточка товара поверх каталога (перехваченный маршрут).
 * Десктоп — панель справа, телефон — шторка снизу. Закрытие = шаг назад в истории.
 */
export function ProductDrawer({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  // Адрес, на котором шторка открылась. Ушли на другую страницу (например, в заявку) — шторка убирается сама
  const [openedAt] = useState(path);
  const away = path !== openedAt;
  const [open, setOpen] = useState(true);
  const mobile = useMediaQuery("(max-width: 767px)");
  const panel = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const drag = useDragControls();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    // После ухода со страницы очистка предыдущего запуска вернёт прокрутку
    if (away) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [close, away]);

  const offscreen = mobile ? { y: "100%" } : { x: "100%" };

  if (away) return null;

  return (
    <AnimatePresence onExitComplete={() => router.back()}>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Карточка товара">
          <motion.button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 cursor-default bg-ink/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            ref={panel}
            tabIndex={-1}
            className="absolute right-0 bottom-0 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-chalk shadow-2xl outline-none md:top-0 md:max-h-none md:w-[min(760px,92vw)] md:rounded-t-none md:rounded-l-[32px]"
            initial={reduce ? { opacity: 0 } : offscreen}
            animate={reduce ? { opacity: 1 } : { x: 0, y: 0 }}
            exit={reduce ? { opacity: 0 } : offscreen}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
            drag={mobile ? "y" : false}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => (i.offset.y > 120 || i.velocity.y > 600) && close()}
          >
            <div
              className="flex touch-none items-center justify-between gap-3 border-b border-line px-4 py-2.5 md:touch-auto md:px-6"
              onPointerDown={(e) => mobile && drag.start(e)}
            >
              <span className="mx-auto h-1.5 w-12 rounded-full bg-seam/60 md:hidden" aria-hidden />
              <button
                type="button"
                onClick={close}
                className="absolute top-2 right-3 grid size-11 place-items-center rounded-full hover:bg-ink/8 md:static md:ml-auto"
                aria-label="Закрыть"
              >
                <X className="size-5" />
              </button>
            </div>
            <div data-lenis-prevent className="overflow-y-auto overscroll-contain px-4 pt-4 pb-10 md:px-8 md:pt-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
