"use client";

import { useEffect, useMemo, useState } from "react";
import DeltaChips from "@/components/DeltaChips";
import { DATA } from "@/lib/data";
import { meets, checkConditions, cityOf } from "@/lib/conditions";
import { fill } from "@/lib/format";
import { TEXT_SPEED, useSettings } from "@/lib/i18n";
import { typeTick } from "@/lib/sound";
import { keyDigit, lockText } from "@/lib/ui";
import type { GameState } from "@/types/game";

function graphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(text), (x) => x.segment);
  return Array.from(text);
}

/** Types text out one character at a time; speed is ms per character, 0 = show at once. */
function useTypewriter(text: string, speed: number, sound: boolean) {
  const parts = useMemo(() => graphemes(text), [text]);
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (speed <= 0) {
      setN(parts.length);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (sound && i % 3 === 0) typeTick();
      if (i >= parts.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [parts, speed, sound]);
  return { shown: parts.slice(0, n).join(""), done: n >= parts.length, finish: () => setN(parts.length) };
}

interface Props {
  state: GameState;
  onChoose: (i: number) => void;
  onDismiss: () => void;
}

export default function EventModal({ state, onChoose, onDismiss }: Props) {
  const { lang, t, has, sound, textSpeed, reducedMotion } = useSettings();
  const ev = state.pendingEvent ? DATA.event[state.pendingEvent] : null;
  const result = state.eventResult;
  const city = cityOf(state);

  const title = result ? (lang === "th" ? result.title_th : result.title_en) : ev ? (lang === "th" ? ev.title_th : ev.title_en) : "";
  const icon = result?.icon ?? ev?.icon ?? "";
  const body = result
    ? lang === "th"
      ? result.text_th
      : result.text_en
    : ev
      ? fill(lang === "th" ? ev.text_th : ev.text_en, state, lang)
      : "";

  const tw = useTypewriter(body, reducedMotion ? 0 : (lang === "th" ? 22 : 16) * TEXT_SPEED[textSpeed], sound);

  // keyboard: Enter/Space finishes the text then continues, 1–9 picks a choice
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter" || e.key === " ") {
        if ((e.target as HTMLElement | null)?.tagName === "BUTTON") return; // the focused button handles it
        e.preventDefault();
        if (!tw.done) tw.finish();
        else if (result) onDismiss();
        return;
      }
      const n = keyDigit(e);
      if (!result && ev && tw.done && n && n <= ev.choices.length && meets(ev.choices[n - 1].requires, state)) {
        e.preventDefault();
        onChoose(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!ev && !result) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg animate-slideUp rounded-t-2xl border border-night-600 bg-night-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-3 flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            {icon}
          </span>
          <h2 className="text-lg font-semibold text-lamp-300">{title}</h2>
          {result?.success !== undefined && (
            <span className={`ml-auto rounded px-2 py-0.5 text-xs ${result.success ? "bg-emerald-900 text-emerald-200" : "bg-rose-900 text-rose-200"}`}>
              {result.success ? t("event.success") : t("event.fail")}
            </span>
          )}
        </div>
        <p
          className="min-h-[4.5rem] cursor-pointer whitespace-pre-line text-[15px] leading-relaxed text-stone-200"
          onClick={tw.finish}
        >
          {tw.shown}
          {!tw.done && <span className="ml-0.5 inline-block w-2 animate-pulse bg-lamp-400">&nbsp;</span>}
        </p>

        {result && tw.done && (
          <div className="mt-3 animate-fadeIn">
            <DeltaChips deltas={result.deltas} city={city} />
          </div>
        )}

        <div className="mt-4 space-y-2">
          {!result && ev && tw.done &&
            ev.choices.map((c, i) => {
              const ok = meets(c.requires, state);
              const reason = ok ? null : checkConditions(c.requires, state);
              const label = fill(lang === "th" ? c.label_th : c.label_en, state, lang);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!ok}
                  onClick={() => onChoose(i)}
                  className={`card-lift block w-full animate-fadeIn rounded-lg border px-4 py-2.5 text-left text-sm ${
                    ok
                      ? "border-night-600 bg-night-800 text-stone-100 hover:bg-night-700"
                      : "cursor-not-allowed border-night-700 bg-night-900 text-stone-500"
                  }`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <kbd className="mr-2 hidden font-mono text-[11px] text-stone-500 sm:inline">{i + 1}</kbd>
                  <span>{label}</span>
                  {c.chance !== undefined && <span className="ml-2 text-[11px] text-amber-300/80">🎲</span>}
                  {reason && <span className="mt-0.5 block text-[11px] text-red-300">🔒 {lockText(reason, t, has, lang)}</span>}
                </button>
              );
            })}
          {!tw.done && (
            <button type="button" onClick={tw.finish} className="w-full rounded-lg py-2 text-xs text-stone-500 hover:text-stone-300">
              ⏩
            </button>
          )}
          {result && tw.done && (
            <button
              type="button"
              onClick={onDismiss}
              autoFocus
              className="w-full rounded-lg bg-lamp-500 px-4 py-2.5 font-medium text-black hover:bg-lamp-400"
            >
              {t("event.continue")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
