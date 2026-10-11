import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Страницы фильтров каталога склеиваются через canonical на /catalog
      { userAgent: "Yandex", allow: "/", disallow: ["/api/", "/cart"] },
      { userAgent: "*", allow: "/", disallow: ["/api/", "/cart"] },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
