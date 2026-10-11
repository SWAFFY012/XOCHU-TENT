import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Открывать dev-сервер с телефона в той же Wi-Fi сети
  allowedDevOrigins: ["192.168.1.23"],
  /* config options here */
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
