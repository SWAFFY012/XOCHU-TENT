import type { MetadataRoute } from "next";
import { getSlugs } from "@/lib/catalog";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/catalog", "/about", "/delivery", "/contacts", "/oferta", "/returns", "/privacy"].map((p) => ({
    url: `${site.url}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : p === "/catalog" ? 0.9 : 0.5,
  }));
  const products = getSlugs().map((slug) => ({
    url: `${site.url}/catalog/${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  return [...pages, ...products];
}
