import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { listenForInstallPrompt, registerServiceWorker } from "./pwa.ts";
import { SEED_SONGS } from "./seed.ts";
import { AppData } from "./storage/app-state.ts";
import { openIdbStore } from "./storage/idb.ts";
import { createMemoryStore } from "./storage/memory.ts";
import "./styles/app.css";

async function start() {
  // Without IndexedDB (some private modes) the app still works, but forgets on reload.
  const store = await openIdbStore().catch(() => createMemoryStore());
  const data = await AppData.load(store, {
    preferredLanguages: navigator.languages,
    seed: SEED_SONGS,
  });
  const root = document.getElementById("root");
  if (!root) throw new Error("#root is missing");
  createRoot(root).render(
    <StrictMode>
      <App data={data} />
    </StrictMode>,
  );
}

registerServiceWorker();
listenForInstallPrompt();
void start();
