"use client";

import { DATA } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { useSettings } from "@/lib/i18n";
import { INVERTED, STAT_ICON } from "@/lib/ui";
import type { City, Deltas, StatKey } from "@/types/game";

export default function DeltaChips({ deltas, city, small = false }: { deltas: Deltas; city: City; small?: boolean }) {
  const { lang, t } = useSettings();
  const chips: { key: string; text: string; good: boolean }[] = [];
  if (Math.abs(deltas.cash) >= 0.5 || (city.currency.decimals > 0 && Math.abs(deltas.cash) >= 0.01))
    chips.push({ key: "cash", text: `💰 ${formatMoney(deltas.cash, city, { sign: true })}`, good: deltas.cash > 0 });
  if (Math.abs(deltas.stash) >= 0.01)
    chips.push({ key: "stash", text: `🫙 ${formatMoney(deltas.stash, city, { sign: true })}`, good: deltas.stash > 0 });
  (Object.entries(deltas.stats) as [StatKey, number][]).forEach(([k, v]) => {
    if (!v) return;
    const good = INVERTED.includes(k) ? v < 0 : v > 0;
    chips.push({ key: k, text: `${STAT_ICON[k]} ${v > 0 ? "+" : ""}${v}`, good });
  });
  Object.entries(deltas.items).forEach(([id, n]) => {
    const it = DATA.item[id];
    if (!it || !n) return;
    chips.push({
      key: `item-${id}`,
      text: `${it.icon} ${n > 0 ? "+" : ""}${n} ${lang === "th" ? it.name_th : it.name_en}`,
      good: n > 0,
    });
  });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c.key}
          title={c.key in STAT_ICON ? t(`stat.${c.key}`) : undefined}
          className={`rounded px-1.5 py-0.5 font-medium tabular-nums ${small ? "text-[10px]" : "text-xs"} ${
            c.good ? "bg-emerald-950/70 text-emerald-300" : "bg-rose-950/70 text-rose-300"
          }`}
        >
          {c.text}
        </span>
      ))}
    </div>
  );
}
