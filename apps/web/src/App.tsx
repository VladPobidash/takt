import { lazy, Suspense, useEffect, useMemo } from "react";
import { Redirect, Route, Switch } from "wouter";
import { AppContext, type App as AppValue } from "./app-context.tsx";
import { EditorScreen } from "./editor/EditorScreen.tsx";
import { VersionsScreen } from "./editor/VersionsScreen.tsx";
import { type Translate, translate } from "./i18n/index.ts";
import { LibraryScreen } from "./library/LibraryScreen.tsx";
import { ServiceMapScreen } from "./setlist/ServiceMapScreen.tsx";
import { SetlistSongScreen } from "./setlist/SetlistSongScreen.tsx";
import { SongScreen } from "./song/SongScreen.tsx";
import { type AppData, useAppState } from "./storage/app-state.ts";

/** Root size of a chord name; quality and bass scale with it (design: 25–26 px by default). */
const CHORD_SIZES = { s: "21px", m: "25px", l: "30px" } as const;

// Settings bring the Base UI combobox with them; loading them on demand keeps the song
// screen within its JavaScript budget (ADR 0003). The chunk is precached like everything else.
const SettingsScreen = lazy(() =>
  import("./settings/SettingsScreen.tsx").then((module) => ({ default: module.SettingsScreen })),
);

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

  const last = state.settings.lastSetlistId;
  const lastSetlist =
    last && state.setlists.some((setlist) => setlist.id === last)
      ? `/setlists/${encodeURIComponent(last)}`
      : null;

  const app = useMemo<AppValue>(() => {
    const t: Translate = (key, params) => translate(language, key, params);
    return { ...state, data, t };
  }, [state, data, language]);

  return (
    <AppContext value={app}>
      <Switch>
        <Route path="/library" component={LibraryScreen} />
        <Route path="/settings">
          <Suspense fallback={null}>
            <SettingsScreen />
          </Suspense>
        </Route>
        <Route path="/setlists/:id/:position">
          {(params) => (
            <SetlistSongScreen setlistId={params.id} position={Number(params.position)} />
          )}
        </Route>
        <Route path="/setlists/:id">
          {(params) => <ServiceMapScreen key={params.id} id={params.id} />}
        </Route>
        <Route path="/songs/:id/versions">
          {(params) => <VersionsScreen key={params.id} id={params.id} />}
        </Route>
        <Route path="/songs/:id/edit">
          {(params) => <EditorScreen key={params.id} id={params.id} />}
        </Route>
        <Route path="/songs/:id">{(params) => <SongScreen key={params.id} id={params.id} />}</Route>
        <Route path="/service">
          {/* The "Service" section: the setlist that was open last, otherwise the list of setlists. */}
          <Redirect to={lastSetlist ?? "/library?tab=setlists"} replace />
        </Route>
        <Route>
          {/* "/" and unknown paths: back to where the musician was, otherwise the library. */}
          <Redirect to={lastSetlist ?? "/library"} replace />
        </Route>
      </Switch>
    </AppContext>
  );
}
