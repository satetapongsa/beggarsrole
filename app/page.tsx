"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CharacterPixels } from "@/components/CharacterSprite";
import FeedbackModal from "@/components/FeedbackModal";
import Flag from "@/components/Flag";
import VersionBar from "@/components/VersionBar";
import { DATA } from "@/lib/data";
import { cityOf } from "@/lib/conditions";
import { fetchDaily, startLife, type DailyInfo } from "@/lib/online";
import { useSettings } from "@/lib/i18n";
import { isNameAllowed } from "@/lib/moderation";
import { makeSeed } from "@/lib/rng";
import { loadDailyStarted, loadGame, loadLastLife, loadNickname, markDailyStarted, saveNickname } from "@/lib/storage";
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
  const [daily, setDaily] = useState<DailyInfo | null>(null);
  const [dailyDone, setDailyDone] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    setSave(loadGame());
    setLast(loadLastLife());
    setName(loadNickname());
    fetchDaily().then((d) => {
      if (!d.ok) return;
      setDaily(d);
      setDailyDone(loadDailyStarted().includes(d.date));
    });
  }, []);

  // the nickname is chosen before birth, so the end screen can put the life on the board right away
  const takeName = () => {
    const n = name.trim();
    if (!n) {
      setNameError(t("title.nameNeeded"));
      return false;
    }
    if (!isNameAllowed(n)) {
      setNameError(t("lb.error.blocked"));
      return false;
    }
    saveNickname(n);
    return true;
  };

  const startDaily = () => {
    if (!daily || dailyDone || !takeName()) return;
    sfx("good");
    markDailyStarted(daily.date);
    startLife(daily.seed, daily.date);
    router.push("/play");
  };

  const start = () => {
    if (!takeName()) return;
    sfx("good");
    startLife(parseSeed(seed));
    router.push("/play");
  };

  const lastEnding = last?.ended ? DATA.ending[last.ended.endingId] : null;

  return (
    <>
    <VersionBar />
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 pb-10 pt-14 text-center">
      <div className="absolute right-4 top-11 flex gap-2">
        <button type="button" onClick={() => setLang(lang === "th" ? "en" : "th")} className="rounded border border-night-600 px-2.5 py-1 text-xs hover:bg-night-800">
          {t("lang.toggle")}
        </button>
        <button type="button" onClick={() => setSound(!sound)} className="rounded border border-night-600 px-2.5 py-1 text-xs hover:bg-night-800">
          {sound ? t("sound.on") : t("sound.off")}
        </button>
        <button type="button" onClick={() => router.push("/settings")} className="rounded border border-night-600 px-2.5 py-1 text-xs hover:bg-night-800">
          {t("settings.title")}
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
        <form
          className="text-left"
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <label htmlFor="player-name" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lamp-300">
            {t("title.name")}
          </label>
          <input
            id="player-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError("");
            }}
            maxLength={20}
            autoComplete="nickname"
            placeholder={t("title.namePlaceholder")}
            className="w-full rounded-lg border border-night-600 bg-night-900 px-3 py-2.5 text-center outline-none focus:border-lamp-500"
          />
          <p className={`mt-1 text-center text-[11px] ${nameError ? "text-red-400" : "text-stone-500"}`}>{nameError || t("title.nameHint")}</p>
        </form>
        <button type="button" onClick={start} disabled={!name.trim()} className="rounded-lg bg-lamp-500 px-6 py-3 text-lg font-semibold text-black shadow-lg shadow-amber-900/40 hover:bg-lamp-400 disabled:opacity-50">
          🎲 {t("title.start")}
        </button>
        {daily &&
          (dailyDone ? (
            <button type="button" onClick={() => router.push("/leaderboard?board=daily")} className="rounded-lg border border-sky-800 bg-sky-950/40 px-6 py-2.5 text-sm text-sky-200 hover:bg-sky-900/40">
              📅 {t("daily.done", { n: daily.number })}
            </button>
          ) : (
            <button type="button" onClick={startDaily} disabled={!name.trim()} className="rounded-lg border border-sky-600 bg-sky-900/50 px-6 py-3 font-semibold text-sky-100 hover:bg-sky-800/60 disabled:opacity-50">
              📅 {t("daily.play", { n: daily.number })}
              <span className="block text-xs font-normal text-sky-300/80">{t("daily.hint")}</span>
            </button>
          ))}
        {save && !save.ended && (
          <button type="button" onClick={() => takeName() && router.push("/play")} disabled={!name.trim()} className="rounded-lg border border-night-600 bg-night-800 px-6 py-3 hover:bg-night-700 disabled:opacity-50">
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
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => router.push("/leaderboard")} className="rounded-lg border border-night-700 px-3 py-2 text-sm text-stone-300 hover:bg-night-800">
            🏆 {t("title.leaderboard")}
          </button>
          <button type="button" onClick={() => router.push("/endings")} className="rounded-lg border border-night-700 px-3 py-2 text-sm text-stone-300 hover:bg-night-800">
            📖 {t("title.endings")}
          </button>
          <button type="button" onClick={() => router.push("/achievements")} className="rounded-lg border border-night-700 px-3 py-2 text-sm text-stone-300 hover:bg-night-800">
            🏅 {t("title.achievements")}
          </button>
          <button type="button" onClick={() => router.push("/lives")} className="rounded-lg border border-night-700 px-3 py-2 text-sm text-stone-300 hover:bg-night-800">
            🕯️ {t("title.lives")}
          </button>
        </div>
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

      <button type="button" onClick={() => setFeedback(true)} className="mt-4 text-xs text-stone-500 hover:text-stone-300">
        💬 {t("feedback.title")}
      </button>
      {feedback && <FeedbackModal onClose={() => setFeedback(false)} />}
    </main>
    </>
  );
}
