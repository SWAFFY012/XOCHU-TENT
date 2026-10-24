import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Открывать dev-сервер с телефона в той же Wi-Fi сети
  allowedDevOrigins: ["192.168.1.23"],
  // Для Hostland: сборка с готовым server.js и минимальным node_modules (.next/standalone).
  output: "standalone",
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
