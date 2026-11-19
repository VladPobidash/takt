import { createContext, useContext } from "react";
import type { Translate } from "./i18n/index.ts";
import type { AppData, AppState } from "./storage/app-state.ts";

export interface App extends AppState {
  data: AppData;
  /** Translates a UI message into the chosen interface language. */
  t: Translate;
}

export const AppContext = createContext<App | null>(null);

export function useApp(): App {
  const app = useContext(AppContext);
  if (!app) throw new Error("useApp must be used inside <AppContext>");
  return app;
}
