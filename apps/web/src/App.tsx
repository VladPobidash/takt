import { useEffect, useMemo } from "react";
import { Redirect, Route, Switch } from "wouter";
import { AppContext, type App as AppValue } from "./app-context.tsx";
import { type Translate, translate } from "./i18n/index.ts";
import { LibraryScreen } from "./library/LibraryScreen.tsx";
import { SettingsScreen } from "./settings/SettingsScreen.tsx";
import { SongScreen } from "./song/SongScreen.tsx";
import { type AppData, useAppState } from "./storage/app-state.ts";

/** Root size of a chord name; quality and bass scale with it (design: 25–26 px by default). */
const CHORD_SIZES = { s: "21px", m: "25px", l: "30px" } as const;

export function App({ data }: { data: AppData }) {
  const state = useAppState(data);
  const { language, theme, chordSize } = state.settings;

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    root.style.setProperty("--chord-size", CHORD_SIZES[chordSize]);
  }, [language, theme, chordSize]);

  const app = useMemo<AppValue>(() => {
    const t: Translate = (key, params) => translate(language, key, params);
    return { ...state, data, t };
  }, [state, data, language]);

  return (
    <AppContext value={app}>
      <Switch>
        <Route path="/library" component={LibraryScreen} />
        <Route path="/settings" component={SettingsScreen} />
        <Route path="/songs/:id">{(params) => <SongScreen key={params.id} id={params.id} />}</Route>
        <Route>
          <Redirect to="/library" replace />
        </Route>
      </Switch>
    </AppContext>
  );
}
