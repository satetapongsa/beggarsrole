// Small pure helpers shared by UI components.

import { DATA } from "@/lib/data";
import type { Deltas, Lang, LockReason, Rarity, StatKey } from "@/types/game";

type T = (key: string, vars?: Record<string, string | number>) => string;

export function lockText(reason: LockReason, t: T, has: (k: string) => boolean, lang: Lang): string {
  const v = reason.vars ?? {};
  if (reason.key === "lock.trait" && typeof v.trait === "string") {
    const tr = DATA.trait[v.trait];
    return t("lock.trait", { trait: tr ? (lang === "th" ? tr.name_th : tr.name_en) : v.trait });
  }
  if (reason.key === "lock.anyTrait" && typeof v.traits === "string") {
    const names = v.traits
      .split("|")
      .map((id) => DATA.trait[id])
      .filter(Boolean)
      .map((tr) => (lang === "th" ? tr.name_th : tr.name_en));
    return t("lock.anyTrait", { traits: names.join(lang === "th" ? " หรือ " : " or ") });
  }
  if (reason.key === "lock.item" && typeof v.item === "string") {
    const it = DATA.item[v.item];
    return t("lock.item", { item: it ? (lang === "th" ? it.name_th : it.name_en) : v.item });
  }
  if ((reason.key === "lock.flag" || reason.key === "lock.notFlag") && typeof v.flag === "string") {
    const specific = `${reason.key}.${v.flag}`;
    if (has(specific)) return t(specific);
  }
  const n = typeof v.n === "number" ? Math.round(v.n * 10) / 10 : v.n;
  return t(reason.key, { ...v, ...(n !== undefined ? { n } : {}) });
}

export const STAT_ICON: Record<StatKey, string> = {
  health: "❤️",
  hunger: "🍚",
  thirst: "💧",
  hygiene: "🧼",
  hope: "😊",
  energy: "⚡",
  rep: "⭐",
  heat: "🚨",
};

/** Stats where a HIGH value is bad. */
export const INVERTED: StatKey[] = ["heat"];

export const RARITY_STYLE: Record<Rarity, string> = {
  common: "bg-stone-600 text-stone-100",
  uncommon: "bg-emerald-700 text-emerald-50",
  rare: "bg-sky-700 text-sky-50",
  epic: "bg-fuchsia-700 text-fuchsia-50",
  legendary: "bg-gradient-to-r from-amber-400 to-orange-500 text-black",
};

export const WEATHER_ICON: Record<string, string> = {
  clear: "☀️",
  cloudy: "⛅",
  rain: "🌧️",
  storm: "⛈️",
  heat: "🔥",
  cold: "🥶",
  snow: "❄️",
};

export function hasDeltas(d?: Deltas): boolean {
  if (!d) return false;
  return (
    Object.keys(d.stats).length > 0 || Math.abs(d.cash) > 0.0001 || Math.abs(d.stash) > 0.0001 || Object.keys(d.items).length > 0
  );
}
