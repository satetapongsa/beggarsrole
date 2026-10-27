"use client";

import { useState } from "react";
import { cityOf } from "@/lib/conditions";
import { formatMoney } from "@/lib/format";
import { useSettings } from "@/lib/i18n";
import { INVERTED, STAT_ICON } from "@/lib/ui";
import type { GameState, StatKey, Strategy } from "@/types/game";

const STRATS: Strategy[] = ["safe", "balanced", "risky"];

export function SkipButtons({ state, onSkip }: { state: GameState; onSkip: (days: number, s: Strategy) => void }) {
  const { t } = useSettings();
  const [open, setOpen] = useState<null | number>(null);
  const weekOk = state.day > 30;
  const monthOk = state.day > 180;
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!weekOk}
          onClick={() => setOpen(7)}
          className="rounded-lg border border-night-600 bg-night-800 px-3 py-2 text-xs text-stone-200 hover:bg-night-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ⏩ {t("skip.week")}
          {!weekOk && <span className="block text-[10px] text-stone-500">{t("skip.lockedWeek")}</span>}
        </button>
        <button
          type="button"
          disabled={!monthOk}
          onClick={() => setOpen(30)}
          className="rounded-lg border border-night-600 bg-night-800 px-3 py-2 text-xs text-stone-200 hover:bg-night-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ⏭️ {t("skip.month")}
          {!monthOk && <span className="block text-[10px] text-stone-500">{t("skip.lockedMonth")}</span>}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="w-full max-w-md animate-slideUp rounded-t-2xl border border-night-600 bg-night-900 p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-lg font-semibold text-lamp-300">{open === 7 ? t("skip.week") : t("skip.month")}</h2>
            <p className="mb-3 text-sm text-stone-400">{t("skip.strategy")}</p>
            <div className="space-y-2">
              {STRATS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setOpen(null);
                    onSkip(open, s);
                  }}
                  className="card-lift w-full rounded-lg border border-night-600 bg-night-800 p-3 text-left hover:bg-night-700"
                >
                  <div className="font-medium text-stone-100">
                    {s === "safe" ? "🛡️" : s === "balanced" ? "⚖️" : "🔥"} {t(`skip.${s}`)}
                  </div>
                  <div className="text-xs text-stone-400">{t(`skip.${s}Desc`)}</div>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setOpen(null)} className="mt-3 w-full py-2 text-sm text-stone-400 hover:text-stone-200">
              {t("skip.cancel")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function SummaryModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  const { lang, t } = useSettings();
  const sum = state.summary;
  if (!sum) return null;
  const city = cityOf(state);
  const diff = sum.cashAfter - sum.cashBefore;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="max-h-[85dvh] w-full max-w-md animate-slideUp overflow-y-auto rounded-t-2xl border border-night-600 bg-night-900 p-5 sm:rounded-2xl">
        <h2 className="mb-3 text-lg font-semibold text-lamp-300">{t("summary.title", { days: sum.days })}</h2>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className={`rounded px-2 py-0.5 font-medium tabular-nums text-xs ${diff >= 0 ? "bg-emerald-950 text-emerald-300" : "bg-rose-950 text-rose-300"}`}>
            💰 {formatMoney(diff, city, { sign: true })}
          </span>
          {(Object.entries(sum.stats) as [StatKey, number][])
            .filter(([, v]) => v !== 0)
            .map(([k, v]) => {
              const good = INVERTED.includes(k) ? v < 0 : v > 0;
              return (
                <span key={k} className={`rounded px-2 py-0.5 font-medium tabular-nums text-xs ${good ? "bg-emerald-950 text-emerald-300" : "bg-rose-950 text-rose-300"}`}>
                  {STAT_ICON[k]} {v > 0 ? "+" : ""}
                  {v}
                </span>
              );
            })}
        </div>
        {sum.milestones.length > 0 && (
          <div className="mb-3">
            <h3 className="mb-1 text-xs uppercase tracking-wider text-stone-500">{t("summary.milestones")}</h3>
            <ul className="space-y-0.5 text-sm text-emerald-300">
              {sum.milestones.map((m) => (
                <li key={m}>🏁 {t(`milestone.${m}`, { amount: formatMoney(city.milestoneCash, city) })}</li>
              ))}
            </ul>
          </div>
        )}
        <h3 className="mb-1 text-xs uppercase tracking-wider text-stone-500">{t("summary.events")}</h3>
        {sum.events.length === 0 ? (
          <p className="text-sm italic text-stone-400">{t("summary.none")}</p>
        ) : (
          <ul className="space-y-1 text-sm text-stone-300">
            {sum.events.map((e, i) => (
              <li key={i}>
                {e.icon} {lang === "th" ? e.th : e.en}
              </li>
            ))}
          </ul>
        )}
        {sum.stoppedEarly && <p className="mt-3 rounded bg-amber-950/60 p-2 text-sm text-amber-200">⚠️ {t("summary.stopped")}</p>}
        <button type="button" onClick={onClose} autoFocus className="mt-4 w-full rounded-lg bg-lamp-500 px-4 py-2.5 font-medium text-black hover:bg-lamp-400">
          {t("summary.close")}
        </button>
      </div>
    </div>
  );
}
