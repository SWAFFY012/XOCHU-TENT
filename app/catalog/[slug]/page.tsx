import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetails } from "@/components/product/ProductDetails";
import { ProductView } from "@/components/product/ProductView";
import { getAllSummaries, getCompactVariants, getSlugs, getSummary } from "@/lib/catalog";
import { categories } from "@/lib/content";
import { getMedia, toClientMedia } from "@/lib/media";
import { formatPrice } from "@/lib/format";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return getSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/catalog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = getSummary(slug);
  if (!p) return {};
  const title = `${p.title} — от ${formatPrice(p.priceFrom)}`;
  const description = `${p.title} от производителя: ${p.sizesCount} размеров, ${p.colors.length} цв. Цена от ${formatPrice(p.priceFrom)}, нестандартные размеры по цене ≈${formatPrice(p.pricePerM2Median)}/м². Пошив ${site.productionDays}.`;
  return {
    title,
    description,
    alternates: { canonical: `/catalog/${slug}` },
    openGraph: { title, description, url: `/catalog/${slug}`, type: "website" },
  };
}

// Слаги пререндерятся при сборке, поэтому в HTML попадает полный контент
export default function ProductPage({ params }: PageProps<"/catalog/[slug]">) {
  return (
    <Suspense fallback={<div className="wrap min-h-screen pt-28" />}>
      <ProductContent params={params} />
    </Suspense>
  );
}

async function ProductContent({ params }: Pick<PageProps<"/catalog/[slug]">, "params">) {
  const { slug } = await params;
  const p = getSummary(slug);
  if (!p) notFound();
  const cat = categories.find((c) => c.id === p.category)!;
  const data = getCompactVariants(slug);
  const related = getAllSummaries()
    .filter((x) => x.slug !== slug && (x.category === p.category || x.material === p.material))
    .slice(0, 4);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.short,
    brand: { "@type": "Brand", name: site.name },
    category: cat.title,
    url: `${site.url}/catalog/${slug}`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "RUB",
      lowPrice: p.priceFrom,
      highPrice: p.priceTo,
      offerCount: p.sizesCount * p.colors.length,
      availability: "https://schema.org/InStock",
    },
  };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: site.url },
      { "@type": "ListItem", position: 2, name: "Каталог", item: `${site.url}/catalog` },
      { "@type": "ListItem", position: 3, name: p.title, item: `${site.url}/catalog/${slug}` },
    ],
  };

  return (
    <div className="wrap pt-24 pb-20 md:pt-28">
      <nav aria-label="Хлебные крошки" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-ink-soft">
        <Link href="/" className="hover:text-ink">Главная</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href="/catalog" className="hover:text-ink">Каталог</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href={`/catalog?cat=${cat.id}`} className="hover:text-ink">{cat.title}</Link>
      </nav>

      <ProductView
        p={p}
        data={data}
        media={toClientMedia(getMedia(slug), data.sizes)}
        heading={
          <div>
            <h1 className="text-[3.2rem] md:text-7xl">{p.title}</h1>
            <p className="mt-3 max-w-[48ch] text-lg text-ink-soft">{p.short}</p>
          </div>
        }
        details={<ProductDetails p={p} />}
      />

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-5xl">Часто берут вместе</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
            {related.map((r) => (
              <ProductCard key={r.slug} p={r} />
            ))}
          </div>
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
    </div>
  );
}
