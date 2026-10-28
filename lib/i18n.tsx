"use client";

// Player settings context (language, sound, text speed, motion). UI strings live in /i18n/*.json.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import th from "@/i18n/th.json";
import en from "@/i18n/en.json";
import { interpolate } from "@/lib/format";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Motion, type Settings, type TextSpeed } from "@/lib/storage";
import { playSfx, type Sfx } from "@/lib/sound";
import type { Lang } from "@/types/game";

const DICTS: Record<Lang, Record<string, string>> = { th, en };

/** Delay multiplier for typed-out text; 0 shows it at once. */
export const TEXT_SPEED: Record<TextSpeed, number> = { slow: 1.7, normal: 1, fast: 0.45, instant: 0 };

interface SettingsCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  sound: boolean;
  setSound: (b: boolean) => void;
  textSpeed: TextSpeed;
  setTextSpeed: (v: TextSpeed) => void;
  motion: Motion;
  setMotion: (v: Motion) => void;
  /** True when animations should be skipped (setting, or the OS preference under "system"). */
  reducedMotion: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  has: (key: string) => boolean;
  sfx: (kind: Sfx) => void;
}

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [osReduce, setOsReduce] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    if (s) setSettings(s);
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setOsReduce(mq.matches);
    const on = (e: MediaQueryListEvent) => setOsReduce(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const { lang, sound, textSpeed, motion } = settings;
  const reducedMotion = motion === "reduce" || (motion === "system" && osReduce);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement.classList;
    root.toggle("reduce-motion", motion === "reduce");
    root.toggle("full-motion", motion === "full");
  }, [motion]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo<SettingsCtx>(
    () => ({
      lang,
      setLang: (l) => update({ lang: l }),
      sound,
      setSound: (b) => update({ sound: b }),
      textSpeed,
      setTextSpeed: (v) => update({ textSpeed: v }),
      motion,
      setMotion: (v) => update({ motion: v }),
      reducedMotion,
      t: (key, vars) => interpolate(DICTS[lang][key] ?? DICTS.en[key] ?? key, vars),
      has: (key) => key in DICTS[lang],
      sfx: (kind) => {
        if (sound) playSfx(kind);
      },
    }),
    [lang, sound, textSpeed, motion, reducedMotion, update],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSettings must be used inside SettingsProvider");
  return v;
}
