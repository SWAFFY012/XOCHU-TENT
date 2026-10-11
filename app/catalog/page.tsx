import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogClient } from "@/components/catalog/CatalogClient";
import { ProductCard } from "@/components/ProductCard";
import { getAllSummaries } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Каталог: тенты, шторы, мягкие окна, теневые сетки, ткани",
  description:
    "Каталог производителя «Хочу Тент»: тенты из брезента, Оксфорда и ПВХ, утеплённые шторы и шторы ПВХ, мягкие окна, теневые сетки и ткани на отрез. Фильтры по материалу, цвету и цене.",
  alternates: { canonical: "/catalog" },
};

export default function CatalogPage() {
  const products = getAllSummaries();

  return (
    <div className="wrap pt-24 pb-20 md:pt-28">
      <header className="mb-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h1 className="text-[3.6rem] md:text-[6.5rem]">Каталог</h1>
          <p className="mt-2 max-w-[56ch] text-lg text-ink-soft">
            12 изделий и почти 10 000 вариантов размеров и цветов. Выберите изделие, а пропитку, цвет и размер — в карточке.
          </p>
        </div>
      </header>

      {/* Без JS и для роботов — полный список; фильтры читают URL на клиенте */}
      <Suspense
        fallback={
          <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
            <div className="hidden lg:block" />
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 pt-24 md:grid-cols-3 md:gap-x-5 lg:pt-20">
              {products.map((p, i) => (
                <ProductCard key={p.slug} p={p} priority={i < 4} />
              ))}
            </div>
          </div>
        }
      >
        <CatalogClient products={products} />
      </Suspense>
    </div>
  );
}
