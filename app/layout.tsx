import type { Metadata, Viewport } from "next";
import { Alumni_Sans, Golos_Text, Jost, Manrope, Tektur, Unbounded } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { site } from "@/lib/site";
import "./globals.css";

const alumni = Alumni_Sans({
  variable: "--font-alumni",
  subsets: ["latin", "cyrillic"],
  weight: ["700", "800", "900"],
  display: "swap",
});

const tektur = Tektur({
  variable: "--font-tektur-src",
  subsets: ["latin", "cyrillic"],
  weight: ["700"],
  display: "swap",
});

// Широкий заголовок «О производстве» — по образцу icondetailing.ru (их Micradi без кириллицы)
const unbounded = Unbounded({
  variable: "--font-unbounded-src",
  subsets: ["latin", "cyrillic"],
  weight: ["600"],
  display: "swap",
});

// Заголовок hero
const manrope = Manrope({
  variable: "--font-manrope-src",
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
  display: "swap",
});

// Подзаголовки: бесплатный аналог Futura
const jost = Jost({
  variable: "--font-jost-src",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400"],
  display: "swap",
});

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Хочу Тент — тенты, шторы и мягкие окна от производителя",
    template: "%s — Хочу Тент",
  },
  description:
    "Производство тентов из брезента, Оксфорда и ПВХ, штор, мягких окон и теневых сеток. Стандартные и нестандартные размеры, пошив за 1–3 дня. Оплата картой или СБП на сайте, доставка по России.",
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "ru_RU", siteName: site.name, url: "/" },
  robots: { index: true, follow: true },
  formatDetection: { telephone: true },
  verification: site.yandexVerification ? { yandex: site.yandexVerification } : undefined,
};

export const viewport: Viewport = {
  themeColor: "#28331f",
  width: "device-width",
  initialScale: 1,
};

const orgLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: site.url,
  telephone: site.phone,
  email: site.email,
  address: { "@type": "PostalAddress", addressLocality: site.city, streetAddress: site.address, addressCountry: "RU" },
  sameAs: [site.ozon, site.telegram],
};

export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${alumni.variable} ${golos.variable} ${tektur.variable} ${manrope.variable} ${jost.variable} ${unbounded.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only z-[70] rounded-full bg-strap px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          К содержимому
        </a>
        <SmoothScroll />
        <Header />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <Footer />
        {modal}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      </body>
    </html>
  );
}
