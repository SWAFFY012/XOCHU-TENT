import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Открывать dev-сервер с телефона в той же Wi-Fi сети
  allowedDevOrigins: ["192.168.1.23"],
  // Для Hostland: сборка с готовым server.js и минимальным node_modules (.next/standalone).
  output: "standalone",
  // Адреса страниц статусов в кабинете Ozon Pay — запасные, ведём на наши страницы заказа
  async redirects() {
    return [
      { source: "/payment/success", destination: "/order/success", permanent: false },
      { source: "/payment/fail", destination: "/order/fail", permanent: false },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
