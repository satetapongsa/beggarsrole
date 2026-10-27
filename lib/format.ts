// Currency formatting per city + text templating for data strings.

import { DATA } from "@/lib/data";
import type { City, GameState, Lang } from "@/types/game";

export function formatMoney(amount: number, city: City, opts: { sign?: boolean } = {}): string {
  const { symbol, decimals } = city.currency;
  const abs = Math.abs(amount);
  const rounded = decimals > 0 ? abs.toFixed(abs >= 1000 ? 0 : decimals) : Math.round(abs).toString();
  const [int, frac] = rounded.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = frac ? `${grouped}.${frac}` : grouped;
  const sign = amount < 0 ? "-" : opts.sign ? "+" : "";
  return `${sign}${symbol}${body}`;
}

export function formatNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Pick `obj[key_th]` or `obj[key_en]`. */
export function tx(obj: object, key: string, lang: Lang): string {
  const o = obj as Record<string, unknown>;
  const v = o[`${key}_${lang}`] ?? o[`${key}_en`] ?? o[`${key}_th`];
  return typeof v === "string" ? v : "";
}

/** Fill {name}, {city}, {dog}, {charity}, {spot} placeholders in data strings. */
export function fill(text: string, s: GameState, lang: Lang, extra: Record<string, string> = {}): string {
  const city = DATA.city[s.cityId];
  const spot = city?.spots.find((sp) => sp.id === s.lastSpot) ?? city?.spots[0];
  const vars: Record<string, string> = {
    name: lang === "th" ? s.character.name_th : s.character.name_en,
    city: city ? (lang === "th" ? city.name_th : city.name_en) : "",
    dog: s.companion
      ? lang === "th"
        ? s.companion.name_th
        : s.companion.name_en
      : lang === "th"
        ? "เจ้าหมา"
        : "the dog",
    charity: city ? (lang === "th" ? city.charity_th : city.charity_en) : "",
    spot: spot ? (lang === "th" ? spot.name_th : spot.name_en) : "",
    ...extra,
  };
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

export function interpolate(text: string, vars: Record<string, string | number> = {}): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
