// Leaderboard score for a finished life. Pure — the server computes it from a replayed life,
// the client only uses it for display.
//
// Balance goal: getting off the street must beat surviving forever. Survival points grow on a log
// curve (farming years of days pays less and less), escaping pays a big rarity bonus, and
// escaping sooner adds a speed bonus.

import { DATA } from "@/lib/data";
import { lifeStats } from "@/lib/engine";
import type { Difficulty, GameState, Rarity } from "@/types/game";

const DIFFICULTY_MULT: Record<Difficulty, number> = { easy: 1, normal: 1.25, hard: 1.5, brutal: 2 };
/** Bonus for getting off the street; death endings get none. */
const ESCAPE_BONUS: Record<Rarity, number> = { common: 2000, uncommon: 3000, rare: 4500, epic: 6500, legendary: 9000 };
/** Full speed bonus for escaping on day 0, shrinking to nothing at SPEED_DAYS. */
const SPEED_BONUS = 3000;
const SPEED_DAYS = 730;
const KINDNESS_CAP = 1500;

export interface ScoreBreakdown {
  survival: number;
  escape: number;
  speed: number;
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
  const escaped = !ending.death;
  const survival = Math.round(1200 * Math.log(1 + st.days / 60));
  const escape = escaped ? ESCAPE_BONUS[ending.rarity] : 0;
  const speed = escaped ? Math.round(SPEED_BONUS * Math.max(0, 1 - st.days / SPEED_DAYS)) : 0;
  const kindness = Math.min(KINDNESS_CAP, st.friends * 20 + st.helped * 15 + st.mealsGiven * 5);
  const mult = DIFFICULTY_MULT[startCity?.difficulty ?? "normal"];
  return { survival, escape, speed, kindness, mult, total: Math.round((survival + escape + speed + kindness) * mult) };
}
