"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone, ShoppingBag, X } from "lucide-react";
import { clsx } from "clsx";
import { Logo } from "./Logo";
import { cartCount, useCart, useHydrated } from "@/lib/cart";
import { site } from "@/lib/site";

const NAV = [
  { href: "/catalog", label: "Каталог" },
  { href: "/about", label: "О производстве" },
  { href: "/contacts", label: "Контакты" },
];

export function Header() {
  const path = usePathname();
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const bump = useCart((s) => s.bump);
  const count = hydrated ? cartCount(items) : 0;
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  // Над видео на главной шапка прозрачная
  const overHero = path === "/" && !scrolled && !menu;

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const [menuPath, setMenuPath] = useState(path);
  if (menuPath !== path) {
    setMenuPath(path);
    setMenu(false);
  }

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
  }, [menu]);

  return (
    <>
      <header
        className={clsx(
          "fixed inset-x-0 top-0 z-40 transition-[background-color,color,box-shadow] duration-300",
          overHero ? "text-paper" : "bg-chalk/85 text-ink shadow-[0_1px_0_var(--color-line)] backdrop-blur-md",
        )}
      >
        <div className="wrap flex h-16 items-center gap-4 md:h-20">
          <Link href="/" className="mr-auto shrink-0 md:mr-0" aria-label="Хочу Тент — на главную">
            <Logo />
          </Link>

          <nav className="hidden flex-1 items-center justify-evenly md:flex" aria-label="Основное меню">
            {NAV.map((n) => {
              const active = path.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} className="group relative py-2 text-[1.05rem] font-medium">
                  <span>{n.label}</span>
                  {/* подчёркивание: растёт от центра при наведении, у активного пункта — всегда */}
                  <span
                    className={clsx(
                      "absolute inset-x-0 -bottom-0.5 h-[2px] origin-center rounded-full bg-strap transition-transform duration-300 ease-out",
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <a href={site.phoneHref} className="hidden items-center gap-2 font-semibold lg:flex">
            <Phone className="size-4" aria-hidden />
            {site.phone}
          </a>

          <Link
            href="/cart"
            className={clsx(
              "relative flex h-11 items-center gap-2 rounded-full px-4 font-semibold",
              overHero ? "bg-paper/15 backdrop-blur" : "bg-ink text-paper",
            )}
            aria-label={`Заявка, товаров: ${count}`}
          >
            <ShoppingBag className="size-[18px]" aria-hidden />
            <span className="hidden sm:inline">Заявка</span>
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={bump}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  className="grid min-w-6 place-items-center rounded-full bg-strap px-1.5 text-sm leading-6 text-ink"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          <button
            type="button"
            className="grid size-11 place-items-center rounded-full md:hidden"
            onClick={() => setMenu((m) => !m)}
            aria-expanded={menu}
            aria-label={menu ? "Закрыть меню" : "Открыть меню"}
          >
            {menu ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {menu && (
          <motion.div
            className="fixed inset-0 z-30 flex flex-col bg-tarp px-4 pt-24 pb-8 text-paper md:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
          >
            <nav className="flex flex-col" aria-label="Мобильное меню">
              {[{ href: "/", label: "Главная" }, ...NAV, { href: "/cart", label: "Заявка" }].map((n, i) => (
                <motion.div
                  key={n.href}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                >
                  <Link href={n.href} className="block border-b border-paper/15 py-3 font-display text-5xl font-extrabold">
                    {n.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3">
              <a href={site.phoneHref} className="btn btn-strap text-lg">
                <Phone className="size-5" /> {site.phone}
              </a>
              <p className="text-center text-sm text-paper/60">{site.hours}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
