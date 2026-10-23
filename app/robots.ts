import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Страницы фильтров каталога склеиваются через canonical на /catalog
      { userAgent: "Yandex", allow: "/", disallow: ["/api/", "/cart", "/order/", "/admin"] },
      { userAgent: "*", allow: "/", disallow: ["/api/", "/cart", "/order/", "/admin"] },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
