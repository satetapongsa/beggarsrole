// Leaderboard score for a finished life. Pure — the server computes it from a replayed life,
// the client only uses it for display.

import { DATA } from "@/lib/data";
import { lifeStats } from "@/lib/engine";
import type { Difficulty, GameState, Rarity } from "@/types/game";

const DIFFICULTY_MULT: Record<Difficulty, number> = { easy: 1, normal: 1.25, hard: 1.5, brutal: 2 };
/** Bonus for getting off the street; death endings get none. */
const ESCAPE_BONUS: Record<Rarity, number> = { common: 300, uncommon: 600, rare: 1000, epic: 1500, legendary: 2500 };

export interface ScoreBreakdown {
  days: number;
  escape: number;
  kindness: number;
  mult: number;
  total: number;
}

export function scoreLife(s: GameState): ScoreBreakdown | null {
  if (!s.ended) return null;
  const ending = DATA.ending[s.ended.endingId];
  if (!ending) return null;
  const st = lifeStats(s);
  // the city you were rolled into, not one you moved to later
  const startCity = DATA.city[s.citiesLived[0]] ?? DATA.city[s.cityId];
  const days = st.days * 10;
  const escape = ending.death ? 0 : ESCAPE_BONUS[ending.rarity];
  const kindness = st.friends * 20 + st.helped * 15 + st.mealsGiven * 5;
  const mult = DIFFICULTY_MULT[startCity?.difficulty ?? "normal"];
  return { days, escape, kindness, mult, total: Math.round((days + escape + kindness) * mult) };
}
