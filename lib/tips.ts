// First-time tips: short hints shown on the play screen the first time a situation comes up
// (first night, hunger getting low, police paying attention...). Each tip is shown once per
// device; the player can turn them all off. Pure — the UI stores which tips were seen.

import type { ActionCategory, GameState } from "@/types/game";

export interface Tip {
  id: string;
  icon: string;
  /** Category tab the tip points at, if any. */
  cat?: ActionCategory;
  when: (s: GameState) => boolean;
}

// Ordered by priority: danger first, then general guidance.
export const TIPS: Tip[] = [
  { id: "welcome", icon: "👋", cat: "earn", when: (s) => s.day <= 1 && s.phase === "morning" },
  { id: "health_low", icon: "❤️", cat: "survive", when: (s) => s.stats.health <= 35 },
  { id: "thirst_low", icon: "💧", cat: "survive", when: (s) => s.stats.thirst <= 30 },
  { id: "hunger_low", icon: "🍚", cat: "survive", when: (s) => s.stats.hunger <= 30 },
  { id: "energy_low", icon: "🔋", cat: "survive", when: (s) => s.stats.energy <= 20 },
  { id: "heat_high", icon: "🚨", when: (s) => s.stats.heat >= 60 },
  { id: "hope_low", icon: "🕯️", cat: "people", when: (s) => s.stats.hope <= 25 },
  { id: "hygiene_low", icon: "🧼", cat: "survive", when: (s) => s.stats.hygiene <= 25 },
  { id: "first_night", icon: "🌙", cat: "survive", when: (s) => s.phase === "night" },
  { id: "skip", icon: "⏩", when: (s) => s.day >= 30 },
  { id: "way_out", icon: "🔑", cat: "future", when: (s) => s.day >= 5 },
];

/** The first tip that applies now and has not been seen yet. */
export function nextTip(s: GameState, seen: Set<string>): Tip | null {
  if (s.ended || !s.revealed) return null;
  return TIPS.find((tip) => !seen.has(tip.id) && tip.when(s)) ?? null;
}
