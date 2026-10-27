"use client";

import { spotViews } from "@/lib/engine";
import { useSettings } from "@/lib/i18n";
import { lockText } from "@/lib/ui";
import type { GameState } from "@/types/game";

function Meter({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const v = Math.max(0, Math.min(1, value));
  const good = invert ? 1 - v : v;
  const color = good > 0.66 ? "bg-emerald-500" : good > 0.33 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
      <span className="w-16 shrink-0">{label}</span>
      <div className="h-1.5 flex-1 rounded bg-night-700">
        <div className={`h-full rounded ${color}`} style={{ width: `${v * 100}%` }} />
      </div>
    </div>
  );
}

interface Props {
  state: GameState;
  title: string;
  onPick: (spotId: string) => void;
  onCancel: () => void;
}

export default function SpotPicker({ state, title, onPick, onCancel }: Props) {
  const { lang, t, has } = useSettings();
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" onClick={onCancel}>
      <div
        className="max-h-[85dvh] w-full max-w-lg animate-slideUp overflow-y-auto rounded-t-2xl border border-night-600 bg-night-900 p-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-semibold text-lamp-300">
          {title} — {t("card.pickSpot")}
        </h2>
        <div className="space-y-2">
          {spotViews(state).map(({ spot, lock }) => (
            <button
              key={spot.id}
              type="button"
              disabled={!!lock}
              onClick={() => onPick(spot.id)}
              className={`card-lift w-full rounded-lg border p-3 text-left ${
                lock ? "cursor-not-allowed border-night-700 opacity-50" : "border-night-600 bg-night-800 hover:bg-night-700"
              } ${state.lastSpot === spot.id ? "ring-1 ring-lamp-500/60" : ""}`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-medium text-stone-100">{lang === "th" ? spot.name_th : spot.name_en}</span>
                <span className="font-medium tabular-nums text-xs text-amber-300">×{spot.income.toFixed(1)}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <Meter label={t("spot.income")} value={(spot.income - 0.5) / 1.1} />
                <Meter label={t("spot.risk")} value={spot.risk} invert />
                <Meter label={t("spot.police")} value={spot.police} invert />
                <Meter label={t("spot.tourists")} value={spot.tourists} />
              </div>
              {lock && <div className="mt-1.5 text-[11px] text-red-300">🔒 {lockText(lock, t, has, lang)}</div>}
            </button>
          ))}
        </div>
        <button type="button" onClick={onCancel} className="mt-3 w-full rounded-lg py-2 text-sm text-stone-400 hover:text-stone-200">
          {t("spot.cancel")}
        </button>
      </div>
    </div>
  );
}
