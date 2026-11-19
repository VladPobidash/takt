import { useEffect, useMemo } from "react";
import { Redirect, Route, Switch } from "wouter";
import { AppContext, type App as AppValue } from "./app-context.tsx";
import { type Translate, translate } from "./i18n/index.ts";
import { LibraryScreen } from "./library/LibraryScreen.tsx";
import { SettingsScreen } from "./settings/SettingsScreen.tsx";
import { SongScreen } from "./song/SongScreen.tsx";
import { type AppData, useAppState } from "./storage/app-state.ts";

export function App({ data }: { data: AppData }) {
  const state = useAppState(data);
  const { language, theme } = state.settings;

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [language, theme]);

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
