import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

/** The version shown in Settings is the one in this package's `package.json` (ADR 0014). */
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // ADR 0007: a new version waits until the user asks for it or the app is restarted.
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "vtakt",
        short_name: "vtakt",
        description: "Bar-based chord charts: one arrangement, a view for every instrument.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#0B0B0C",
        theme_color: "#0B0B0C",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Everything the app needs is precached: nothing on the playing path uses the network.
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,webmanifest}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  server: { host: true },
  // Playwright owns e2e/; Vitest runs the unit tests next to the sources.
  test: { include: ["src/**/*.test.{ts,tsx}"] },
});
