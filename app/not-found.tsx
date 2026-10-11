import Link from "next/link";
import { ProductArt } from "@/components/ProductArt";

export default function NotFound() {
  return (
    <section className="wrap grid flex-1 items-center gap-8 overflow-x-clip pt-28 pb-20 md:grid-cols-[1.3fr_1fr]">
      <div>
        <p className="font-display text-[9rem] leading-[0.8] font-black text-strap md:text-[14rem]">404</p>
        <h1 className="mt-4 text-5xl md:text-7xl">Такой страницы нет. Наверное, её унесло ветром</h1>
        <p className="mt-4 max-w-[44ch] text-lg text-ink-soft">
          Ссылка устарела или в адресе опечатка. Тенты, которые её удержали бы, — в каталоге.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/catalog" className="btn btn-strap">
            Открыть каталог
          </Link>
          <Link href="/" className="btn btn-ghost">
            На главную
          </Link>
        </div>
      </div>
      <ProductArt kind="tarp" color="Синий" className="mx-auto w-full max-w-sm rotate-[14deg]" />
    </section>
  );
}
