"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CharacterPixels } from "@/components/CharacterSprite";
import Flag from "@/components/Flag";
import { DATA } from "@/lib/data";
import { cityOf } from "@/lib/conditions";
import { startLife } from "@/lib/online";
import { useSettings } from "@/lib/i18n";
import { makeSeed } from "@/lib/rng";
import { loadGame, loadLastLife } from "@/lib/storage";
import type { GameState } from "@/types/game";

const DEMO = { skin: "#c98e62", hair: "#1b1410", shirt: "#b4443a", pants: "#3a3f4b", hairStyle: 2 };

function parseSeed(raw: string): number {
  const v = raw.trim();
  if (!v) return makeSeed();
  if (/^\d+$/.test(v)) return Number(v) >>> 0;
  let h = 2166136261;
  for (let i = 0; i < v.length; i++) h = Math.imul(h ^ v.charCodeAt(i), 16777619);
  return h >>> 0;
}

export default function TitlePage() {
  const router = useRouter();
  const { lang, setLang, t, sound, setSound, sfx } = useSettings();
  const [save, setSave] = useState<GameState | null>(null);
  const [last, setLast] = useState<GameState | null>(null);
  const [seed, setSeed] = useState("");
  const [showSeed, setShowSeed] = useState(false);

  useEffect(() => {
    setSave(loadGame());
    setLast(loadLastLife());
  }, []);

  const start = () => {
    sfx("good");
    startLife(parseSeed(seed));
    router.push("/play");
  };

  const lastEnding = last?.ended ? DATA.ending[last.ended.endingId] : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 py-10 text-center">
      <div className="absolute right-4 top-4 flex gap-2">
        <button type="button" onClick={() => setLang(lang === "th" ? "en" : "th")} className="rounded border border-night-600 px-2.5 py-1 text-xs hover:bg-night-800">
          {t("lang.toggle")}
        </button>
        <button type="button" onClick={() => setSound(!sound)} className="rounded border border-night-600 px-2.5 py-1 text-xs hover:bg-night-800">
          {sound ? t("sound.on") : t("sound.off")}
        </button>
      </div>

      {/* street-lamp hero */}
      <svg viewBox="0 0 80 60" className="pixelated mb-6 w-56 sm:w-64" aria-hidden>
        <defs>
          <radialGradient id="hero-glow">
            <stop offset="0%" stopColor="#ffcf7a" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffb547" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className="animate-flicker" cx="52" cy="14" r="26" fill="url(#hero-glow)" />
        <rect x="55" y="10" width="2" height="44" fill="#2b2b2b" />
        <rect x="48" y="8" width="10" height="3" fill="#2b2b2b" />
        <rect x="48" y="11" width="4" height="2" fill="#ffe2a0" />
        <rect x="0" y="54" width="80" height="6" fill="#3a3026" />
        <rect x="22" y="52" width="26" height="3" fill="#b88a55" />
        <rect x="25" y="49" width="4" height="4" fill="#d8d2c4" />
        <g className="anim-bob">
          <CharacterPixels appearance={DEMO} x={30} y={30} />
        </g>
      </svg>

      <h1 className="lamp-glow font-pixel text-5xl font-bold tracking-wide text-lamp-300 sm:text-6xl">{t("game.title")}</h1>
      <p className="mt-1 text-lg text-stone-300">{t("game.subtitle")}</p>
      <p className="mt-4 max-w-sm text-sm italic text-stone-400">“{t("game.tagline")}”</p>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <button type="button" onClick={start} className="rounded-lg bg-lamp-500 px-6 py-3 text-lg font-semibold text-black shadow-lg shadow-amber-900/40 hover:bg-lamp-400">
          🎲 {t("title.start")}
        </button>
        {save && !save.ended && (
          <button type="button" onClick={() => router.push("/play")} className="rounded-lg border border-night-600 bg-night-800 px-6 py-3 hover:bg-night-700">
            ▶ {t("title.continue")}
            <span className="block text-xs text-stone-400">
              {t("title.continueInfo", {
                name: lang === "th" ? save.character.name_th : save.character.name_en,
                day: save.day,
                city: `${lang === "th" ? cityOf(save).name_th : cityOf(save).name_en}`,
              })}
            </span>
          </button>
        )}
        {lastEnding && (
          <button type="button" onClick={() => router.push("/end")} className="rounded-lg border border-night-700 px-6 py-2 text-sm text-stone-300 hover:bg-night-800">
            {t("title.viewLast")}: {lastEnding.icon} {lang === "th" ? lastEnding.title_th : lastEnding.title_en}
          </button>
        )}
        <button type="button" onClick={() => router.push("/leaderboard")} className="rounded-lg border border-night-700 px-6 py-2 text-sm text-stone-300 hover:bg-night-800">
          🏆 {t("title.leaderboard")}
        </button>
        <button type="button" onClick={() => setShowSeed((v) => !v)} className="text-xs text-stone-500 hover:text-stone-300">
          {t("title.seed")}
        </button>
        {showSeed && (
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder={t("title.seedHint")}
            className="rounded-lg border border-night-600 bg-night-900 px-3 py-2 text-center text-sm outline-none focus:border-lamp-500"
          />
        )}
      </div>

      <section className="mt-10 w-full rounded-xl border border-night-700 bg-night-900/70 p-5 text-left">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-lamp-300">{t("title.how")}</h2>
        <ul className="space-y-1.5 text-sm text-stone-300">
          <li>🌍 {t("title.how1")}</li>
          <li>🌅 {t("title.how2")}</li>
          <li>🔑 {t("title.how3")}</li>
        </ul>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5" aria-hidden>
          {DATA.cities.map((c) => (
            <span key={c.id} title={lang === "th" ? c.name_th : c.name_en}>
              <Flag cityId={c.id} size={26} />
            </span>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-stone-500">{t("title.disclaimer")}</p>
      </section>
    </main>
  );
}
