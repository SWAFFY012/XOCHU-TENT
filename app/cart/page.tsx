import type { Metadata } from "next";
import { CartClient } from "@/components/cart/CartClient";

export const metadata: Metadata = {
  title: "Заявка",
  description: "Оформление заявки на тенты, шторы и мягкие окна.",
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <div className="wrap pt-[4.5rem] pb-16 md:pt-24">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 md:mb-5">
        <h1 className="text-[2.6rem] md:text-[4.2rem]">Заявка</h1>
        <p className="hidden text-lg text-ink-soft sm:block">Проверьте позиции и оставьте контакты — менеджер перезвонит.</p>
      </div>
      <CartClient />
    </div>
  );
}
