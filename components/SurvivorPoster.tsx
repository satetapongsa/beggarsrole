"use client";

// "I made it" poster for lives that got off the street: a 4:5 keepsake (1080×1350 when saved)
// with the character's last scene at sunrise, the ending and the life in numbers.
// Rendered as real DOM and exported with html-to-image, so fonts and pixel art match the game.

import { useEffect, useRef, useState } from "react";
import Flag from "@/components/Flag";
import PixelScene from "@/components/PixelScene";
import { ageGroupOf, cityOf } from "@/lib/conditions";
import { dailyNumber } from "@/lib/daily";
import { lifeStats } from "@/lib/engine";
import { fill, formatNumber } from "@/lib/format";
import { useSettings } from "@/lib/i18n";
import { POSTER_UNLOCKS } from "@/lib/achievements";
import { loadAchievements, type LastRun } from "@/lib/storage";
import { RARITY_STYLE } from "@/lib/ui";
import type { Ending, GameState } from "@/types/game";

const W = 540;
const H = 675;

type Theme = "dawn" | "night" | "gold" | "neon" | "paper";
const THEMES: Record<Theme, { bg: string; ink: string; soft: string; accent: string; card: string; swatch: string }> = {
  dawn: {
    bg: "linear-gradient(172deg, #ffc58a 0%, #f38a6b 30%, #8e4f7a 62%, #2a1b3d 100%)",
    ink: "#fff8f0",
    soft: "rgba(255,248,240,0.78)",
    accent: "#ffe1a8",
    card: "rgba(20,12,30,0.35)",
    swatch: "linear-gradient(135deg,#ffc58a,#8e4f7a)",
  },
  night: {
    bg: "radial-gradient(circle at 78% 8%, rgba(255,181,71,0.35) 0%, rgba(255,181,71,0) 42%), linear-gradient(170deg, #241d16 0%, #0b0907 70%)",
    ink: "#f3eadf",
    soft: "rgba(243,234,223,0.7)",
    accent: "#ffd28a",
    card: "rgba(255,255,255,0.06)",
    swatch: "linear-gradient(135deg,#3a2e22,#0b0907)",
  },
  gold: {
    bg: "linear-gradient(160deg, #fff3c4 0%, #fbbf24 38%, #b45309 75%, #451a03 100%)",
    ink: "#2a1504",
    soft: "rgba(42,21,4,0.75)",
    accent: "#451a03",
    card: "rgba(255,255,255,0.28)",
    swatch: "linear-gradient(135deg,#fff3c4,#b45309)",
  },
  // unlocked by achievements (POSTER_UNLOCKS)
  neon: {
    bg: "radial-gradient(circle at 20% 10%, rgba(236,72,153,0.45) 0%, rgba(236,72,153,0) 45%), radial-gradient(circle at 85% 30%, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0) 45%), linear-gradient(170deg, #1a0b2e 0%, #05030c 100%)",
    ink: "#f5f3ff",
    soft: "rgba(245,243,255,0.72)",
    accent: "#67e8f9",
    card: "rgba(236,72,153,0.14)",
    swatch: "linear-gradient(135deg,#ec4899,#22d3ee)",
  },
  paper: {
    bg: "repeating-linear-gradient(0deg, rgba(120,90,50,0.06) 0px, rgba(120,90,50,0.06) 1px, transparent 1px, transparent 28px), linear-gradient(170deg, #f7efe0 0%, #e9dcc2 100%)",
    ink: "#2b2118",
    soft: "rgba(43,33,24,0.68)",
    accent: "#8a3b12",
    card: "rgba(120,90,50,0.12)",
    swatch: "linear-gradient(135deg,#f7efe0,#c9b38a)",
  },
};

export default function SurvivorPoster({ life, ending, run }: { life: GameState; ending: Ending; run: LastRun | null }) {
  const { lang, t } = useSettings();
  const [theme, setTheme] = useState<Theme>(ending.rarity === "legendary" || ending.rarity === "epic" ? "gold" : "dawn");
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const poster = useRef<HTMLDivElement>(null);
  const [earned, setEarned] = useState(0);

  useEffect(() => setEarned(Object.keys(loadAchievements()).length), []);
  const needFor = (k: Theme) => POSTER_UNLOCKS.find((u) => u.theme === k)?.need ?? 0;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const city = cityOf(life);
  const st = lifeStats(life);
  const spot = city.spots.find((s) => s.id === life.lastSpot) ?? city.spots[0];
  const th = THEMES[theme];
  const name = lang === "th" ? life.character.name_th : life.character.name_en;
  const date = new Date().toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  const save = async () => {
    if (!poster.current) return;
    setBusy(true);
    setError(false);
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(poster.current, { pixelRatio: 1080 / W, cacheBust: true });
      if (!blob) throw new Error("no image");
      const file = new File([blob], `spare-change-${life.seed}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "SPARE CHANGE" });
          return;
        } catch {
          /* cancelled — fall back to download */
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const numbers: [string, string][] = [
    [formatNumber(st.days), t("poster.days")],
    [String(st.friends), t("poster.friends")],
    [run?.score ? formatNumber(run.score) : "—", t("og.score")],
  ];

  return (
    <section className="mt-6 rounded-xl border border-lamp-500/40 bg-night-900 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-lamp-300">🖼️ {t("poster.title")}</h2>
        <div className="flex gap-2" role="radiogroup" aria-label={t("poster.theme")}>
          {(Object.keys(THEMES) as Theme[]).map((k) => {
            const locked = earned < needFor(k);
            const label = locked ? t("poster.locked", { theme: t(`poster.theme.${k}`), n: needFor(k) }) : t(`poster.theme.${k}`);
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={theme === k}
                aria-label={label}
                title={label}
                disabled={locked}
                onClick={() => setTheme(k)}
                className={`relative h-7 w-7 rounded-full border-2 disabled:cursor-not-allowed ${theme === k ? "border-lamp-300" : "border-night-600"}`}
                style={{ background: THEMES[k].swatch, opacity: locked ? 0.35 : 1 }}
              >
                {locked && <span className="absolute inset-0 flex items-center justify-center text-[11px]" aria-hidden>🔒</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={wrap} className="w-full">
        <div className="mx-auto overflow-hidden rounded-2xl" style={{ width: W * scale, height: H * scale }}>
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <div
            ref={poster}
            className="font-body"
            style={{ width: W, height: H, background: th.bg, color: th.ink, padding: 32, display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: th.soft }}>
              <span className="font-pixel" style={{ fontSize: 18, fontWeight: 700, color: th.accent, letterSpacing: 1 }}>
                SPARE CHANGE
              </span>
              <span>{life.daily ? `📅 ${t("daily.badge", { n: dailyNumber(life.daily) })}` : date}</span>
            </div>

            <div style={{ marginTop: 18, fontSize: 40, fontWeight: 600, lineHeight: 1.1 }}>{t("poster.headline")}</div>
            <div style={{ marginTop: 4, fontSize: 15, color: th.soft }}>{t("poster.sub", { days: formatNumber(st.days) })}</div>

            <div style={{ marginTop: 18, borderRadius: 14, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
              <PixelScene
                scene={spot.scene}
                phase="morning"
                weather="clear"
                appearance={life.character.appearance}
                hygiene={Math.max(60, life.stats.hygiene)}
                sick={false}
                dog={!!life.companion}
                ageGroup={ageGroupOf(life.ended?.age ?? life.age)}
                festival={false}
                label={lang === "th" ? spot.name_th : spot.name_en}
              />
            </div>

            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 44 }} aria-hidden>
                {ending.icon}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.15, color: th.accent }}>{lang === "th" ? ending.title_th : ending.title_en}</div>
                <span className={RARITY_STYLE[ending.rarity]} style={{ display: "inline-block", marginTop: 4, borderRadius: 999, padding: "1px 10px", fontSize: 11, fontWeight: 600 }}>
                  {t(`rarity.${ending.rarity}`)}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 16, fontStyle: "italic", lineHeight: 1.45, color: th.ink }}>
              “{fill(lang === "th" ? ending.line_th : ending.line_en, life, lang)}”
            </div>

            <div style={{ marginTop: "auto", display: "flex", gap: 10 }}>
              {numbers.map(([value, label]) => (
                <div key={label} style={{ flex: 1, background: th.card, borderRadius: 12, padding: "8px 10px" }}>
                  <div style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</div>
                  <div style={{ fontSize: 11, color: th.soft }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: th.soft }}>
              <Flag cityId={city.id} size={20} />
              <span>
                {name} · {lang === "th" ? city.name_th : city.name_en} · {life.character.ageStart === (life.ended?.age ?? life.age)
                  ? t("poster.ageOne", { age: life.character.ageStart })
                  : t("poster.age", { from: life.character.ageStart, to: life.ended?.age ?? life.age })}
              </span>
            </div>
          </div>
        </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy}
        className="mt-4 w-full rounded-lg bg-lamp-500 px-4 py-3 font-semibold text-black hover:bg-lamp-400 disabled:opacity-60"
      >
        {busy ? "…" : `💾 ${t("poster.save")}`}
      </button>
      {error && <p className="mt-2 text-center text-xs text-red-400">{t("poster.error")}</p>}
    </section>
  );
}
