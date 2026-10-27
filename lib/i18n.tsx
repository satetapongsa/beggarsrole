"use client";

// Language + sound settings context. UI strings live in /i18n/*.json.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import th from "@/i18n/th.json";
import en from "@/i18n/en.json";
import { interpolate } from "@/lib/format";
import { loadSettings, saveSettings } from "@/lib/storage";
import { playSfx, type Sfx } from "@/lib/sound";
import type { Lang } from "@/types/game";

const DICTS: Record<Lang, Record<string, string>> = { th, en };

interface SettingsCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  sound: boolean;
  setSound: (b: boolean) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  has: (key: string) => boolean;
  sfx: (kind: Sfx) => void;
}

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");
  const [sound, setSoundState] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    if (s) {
      setLangState(s.lang);
      setSoundState(s.sound);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      saveSettings({ lang: l, sound });
    },
    [sound],
  );
  const setSound = useCallback(
    (b: boolean) => {
      setSoundState(b);
      saveSettings({ lang, sound: b });
    },
    [lang],
  );

  const value = useMemo<SettingsCtx>(
    () => ({
      lang,
      setLang,
      sound,
      setSound,
      t: (key, vars) => interpolate(DICTS[lang][key] ?? DICTS.en[key] ?? key, vars),
      has: (key) => key in DICTS[lang],
      sfx: (kind) => {
        if (sound) playSfx(kind);
      },
    }),
    [lang, setLang, sound, setSound],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSettings must be used inside SettingsProvider");
  return v;
}
