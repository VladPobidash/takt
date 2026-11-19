import { execSync } from "node:child_process";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function appVersion(): string {
  const date = new Date().toISOString().slice(0, 10);
  try {
    return `${execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim()} · ${date}`;
  } catch {
    return date;
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  server: { host: true },
});
