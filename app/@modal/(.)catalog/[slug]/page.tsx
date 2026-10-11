import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { ProductDrawer } from "@/components/product/ProductDrawer";
import { ProductDetails } from "@/components/product/ProductDetails";
import { ProductView } from "@/components/product/ProductView";
import { getCompactVariants, getSlugs, getSummary } from "@/lib/catalog";
import { categories } from "@/lib/content";
import { getMedia, toClientMedia } from "@/lib/media";

export function generateStaticParams() {
  return getSlugs().map((slug) => ({ slug }));
}

// Карточка поверх каталога: панель выезжает сразу, содержимое догружается внутри
export default function ProductModal({ params }: PageProps<"/catalog/[slug]">) {
  return (
    <ProductDrawer>
      <Suspense fallback={<DrawerSkeleton />}>
        <ModalContent params={params} />
      </Suspense>
    </ProductDrawer>
  );
}

async function ModalContent({ params }: Pick<PageProps<"/catalog/[slug]">, "params">) {
  const { slug } = await params;
  const p = getSummary(slug);
  if (!p) notFound();
  const data = getCompactVariants(slug);

  return (
    <ProductView
      compact
      p={p}
      data={data}
      media={toClientMedia(getMedia(slug), data.sizes)}
      heading={
        <div>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-ink-soft">
            {categories.find((c) => c.id === p.category)?.title}
            {/* обычная ссылка: полная загрузка страницы, а не повторный перехват */}
            <a href={`/catalog/${slug}`} className="flex items-center gap-1 font-medium text-oxford hover:underline">
              <ExternalLink className="size-3.5" aria-hidden /> Страница товара
            </a>
          </p>
          <h2 className="mt-1 text-[2.6rem] md:text-5xl">{p.title}</h2>
          <p className="mt-2 text-ink-soft">{p.short}</p>
        </div>
      }
      details={<ProductDetails p={p} />}
    />
  );
}

function DrawerSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-label="Загружаем товар">
      <div className="aspect-[4/5] rounded-[26px] bg-ink/8 sm:aspect-square" />
      <div className="h-12 w-3/4 rounded-xl bg-ink/8" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="size-11 rounded-full bg-ink/8" />
        ))}
      </div>
      <div className="h-40 rounded-[22px] bg-ink/8" />
    </div>
  );
}
