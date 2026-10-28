"use client";

// One first-time tip at a time, above the action cards. "Got it" marks it seen; "Show me" also
// switches to the category tab the tip talks about.

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/i18n";
import { loadTips, saveTips, type TipState } from "@/lib/storage";
import { nextTip } from "@/lib/tips";
import type { ActionCategory, GameState } from "@/types/game";

export default function GuideTip({ state, onCat }: { state: GameState; onCat: (c: ActionCategory) => void }) {
  const { t } = useSettings();
  const [tips, setTips] = useState<TipState | null>(null);

  useEffect(() => setTips(loadTips()), []);

  if (!tips || tips.off) return null;
  const tip = nextTip(state, new Set(tips.seen));
  if (!tip) return null;

  const update = (next: TipState) => {
    setTips(next);
    saveTips(next);
  };
  const done = () => update({ ...tips, seen: [...tips.seen, tip.id] });

  return (
    <div role="note" className="animate-fadeIn rounded-lg border border-sky-800 bg-sky-950/50 p-3">
      <p className="text-sm text-sky-100">
        <span aria-hidden className="mr-1.5">
          {tip.icon}
        </span>
        {t(`tip.${tip.id}`)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {tip.cat && (
          <button
            type="button"
            onClick={() => {
              onCat(tip.cat!);
              done();
            }}
            className="rounded bg-sky-700 px-2.5 py-1 font-medium text-white hover:bg-sky-600"
          >
            {t("tip.show", { tab: t(`cat.${tip.cat}`) })}
          </button>
        )}
        <button type="button" onClick={done} className="rounded border border-sky-700 px-2.5 py-1 text-sky-200 hover:bg-sky-900">
          {t("tip.ok")}
        </button>
        <button type="button" onClick={() => update({ ...tips, off: true })} className="ml-auto text-sky-400/70 hover:text-sky-200">
          {t("tip.off")}
        </button>
      </div>
    </div>
  );
}
