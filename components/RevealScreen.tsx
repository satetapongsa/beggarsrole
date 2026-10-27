"use client";

import { useEffect, useState } from "react";
import CharacterSprite from "@/components/CharacterSprite";
import Flag from "@/components/Flag";
import { DATA } from "@/lib/data";
import { cityOf } from "@/lib/conditions";
import { formatMoney, formatNumber } from "@/lib/format";
import { useSettings } from "@/lib/i18n";
import type { GameState } from "@/types/game";

export default function RevealScreen({ state, onBegin }: { state: GameState; onBegin: () => void }) {
  const { lang, t, sfx } = useSettings();
  const [stage, setStage] = useState(0);
  const [flagIdx, setFlagIdx] = useState(0);
  const city = cityOf(state);
  const origin = DATA.origin[state.character.origin];
  const c = state.character;

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStage(6);
      return;
    }
    const spin = window.setInterval(() => setFlagIdx((i) => (i + 1) % DATA.cities.length), 90);
    const timers = [
      window.setTimeout(() => {
        window.clearInterval(spin);
        setStage(1);
        sfx("event");
      }, 2300),
      window.setTimeout(() => setStage(2), 2900),
      window.setTimeout(() => setStage(3), 3500),
      window.setTimeout(() => setStage(4), 4300),
      window.setTimeout(() => setStage(5), 5000),
      window.setTimeout(() => {
        setStage(6);
        sfx("milestone");
      }, 5700),
    ];
    return () => {
      window.clearInterval(spin);
      timers.forEach((x) => window.clearTimeout(x));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const name = lang === "th" ? c.name_th : c.name_en;
  const skip = () => setStage(6);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-night-950 p-4" onClick={stage < 6 ? skip : undefined}>
      <div className="w-full max-w-md py-6 text-center">
        {stage === 0 ? (
          <div>
            <div className="mb-6 text-sm uppercase tracking-[0.3em] text-stone-500">{t("reveal.rolling")}</div>
            <div className="animate-spinFlag text-[96px] leading-none" style={{ perspective: 400 }} aria-hidden>
              <Flag cityId={DATA.cities[flagIdx].id} size={144} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex animate-popIn justify-center" aria-hidden>
              <Flag cityId={city.id} size={132} />
            </div>
            <div className="animate-fadeIn">
              <div className="text-xs uppercase tracking-[0.3em] text-stone-500">{t("reveal.in")}</div>
              <div className="lamp-glow font-pixel text-3xl text-lamp-300">{lang === "th" ? city.name_th : city.name_en}</div>
              <div className="text-xs text-stone-500">
                {lang === "th" ? city.country_th : city.country_en} · {t(`climate.${city.climate}`)} · {t(`shelter.${city.shelter}`)} ·{" "}
                <span className="text-amber-300">
                  {t("reveal.difficulty")}: {t(`difficulty.${city.difficulty}`)}
                </span>
              </div>
            </div>

            {stage >= 2 && (
              <div className="flex animate-popIn items-center justify-center gap-4">
                <CharacterSprite appearance={c.appearance} hygiene={state.stats.hygiene} size={56} />
                <div className="text-left">
                  <div className="text-xs text-stone-500">{t("reveal.youAre")}</div>
                  <div className="text-2xl font-semibold text-stone-100">{name}</div>
                  <div className="text-sm text-stone-400">{t("reveal.age", { age: state.age })}</div>
                </div>
              </div>
            )}

            {stage >= 3 && origin && (
              <div className="animate-fadeIn rounded-lg border border-night-700 bg-night-900 p-4 text-left">
                <div className="mb-1 text-xs uppercase tracking-wider text-stone-500">{t("reveal.origin")}</div>
                <div className="mb-1 font-medium text-lamp-300">{lang === "th" ? origin.name_th : origin.name_en}</div>
                <p className="text-sm leading-relaxed text-stone-300">{lang === "th" ? origin.story_th : origin.story_en}</p>
              </div>
            )}

            {stage >= 4 && (
              <div className="animate-fadeIn">
                <div className="mb-1.5 text-xs uppercase tracking-wider text-stone-500">{t("reveal.traits")}</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {c.traits.map((id, i) => {
                    const tr = DATA.trait[id];
                    if (!tr) return null;
                    return (
                      <div
                        key={id}
                        className={`animate-popIn rounded-lg border px-3 py-1.5 text-left ${
                          tr.positive ? "border-emerald-800 bg-emerald-950/40" : "border-rose-900 bg-rose-950/40"
                        }`}
                        style={{ animationDelay: `${i * 150}ms` }}
                      >
                        <div className="text-sm font-medium">
                          {tr.icon} {lang === "th" ? tr.name_th : tr.name_en}
                        </div>
                        <div className="max-w-[14rem] text-[11px] text-stone-400">{lang === "th" ? tr.desc_th : tr.desc_en}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {stage >= 5 && (
              <div className="animate-fadeIn text-xs text-stone-400">
                {t("reveal.cash")}: <span className="font-medium tabular-nums text-emerald-300">{formatMoney(state.cash, city)}</span>
                {Object.keys(state.items).length > 0 && (
                  <>
                    {" · "}
                    {t("reveal.items")}:{" "}
                    {Object.keys(state.items)
                      .map((id) => DATA.item[id])
                      .filter(Boolean)
                      .map((it) => `${it.icon} ${lang === "th" ? it.name_th : it.name_en}`)
                      .join(", ")}
                  </>
                )}
              </div>
            )}

            {stage >= 6 && (
              <div className="animate-popIn space-y-4 pt-2">
                <div className="lamp-glow text-lg font-semibold text-lamp-300">
                  {t("reveal.oneIn", { n: formatNumber(c.oneIn) })}
                </div>
                <button
                  type="button"
                  onClick={onBegin}
                  autoFocus
                  className="rounded-lg bg-lamp-500 px-8 py-3 text-lg font-semibold text-black shadow-lg shadow-amber-900/40 hover:bg-lamp-400"
                >
                  {t("reveal.begin")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
