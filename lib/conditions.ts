// Evaluates requirements for actions, events, choices and endings.
// Pure: reads GameState + static data, never mutates.

import { DATA } from "@/lib/data";
import type {
  AgeGroup,
  City,
  Conditions,
  Festival,
  GameState,
  LockReason,
  StatKey,
  ThresholdKey,
} from "@/types/game";

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export interface CondContext {
  actionId?: string;
  spotId?: string | null;
}

export function cityOf(s: GameState): City {
  return DATA.city[s.cityId] ?? DATA.cities[0];
}

export function allTraits(s: GameState): string[] {
  return [...s.character.traits, ...s.character.hiddenTraits];
}

export function hasTrait(s: GameState, id: string): boolean {
  return s.character.traits.includes(id) || s.character.hiddenTraits.includes(id);
}

/** Day of year 0–364 for the current game day. */
export function dayOfYear(s: GameState): number {
  return (s.startDoy + s.day - 1) % 365;
}

export function dateOf(doy: number): { month: number; day: number } {
  let d = doy;
  for (let m = 0; m < 12; m++) {
    if (d < MONTH_DAYS[m]) return { month: m + 1, day: d + 1 };
    d -= MONTH_DAYS[m];
  }
  return { month: 12, day: 31 };
}

export function doyOf(month: number, day: number): number {
  let d = 0;
  for (let m = 0; m < month - 1; m++) d += MONTH_DAYS[m];
  return d + day - 1;
}

export function currentMonth(s: GameState): number {
  return dateOf(dayOfYear(s)).month;
}

export function activeFestivals(s: GameState): Festival[] {
  const doy = dayOfYear(s);
  return cityOf(s).festivals.filter((f) => {
    const start = doyOf(f.start[0], f.start[1]);
    const diff = (doy - start + 365) % 365;
    return diff < f.days;
  });
}

export function festivalBonus(s: GameState): number {
  return activeFestivals(s).reduce((b, f) => Math.max(b, f.bonus), 1);
}

export function ageGroupOf(age: number): AgeGroup {
  if (age < 15) return "child";
  if (age < 25) return "young";
  if (age < 50) return "adult";
  return "elder";
}

export function meal(s: GameState): number {
  return cityOf(s).meal;
}

export function threshold(s: GameState, key: ThresholdKey): number {
  const m = meal(s);
  if (key === "cash") return s.cash / m;
  if (key === "stash") return s.stash / m;
  if (key === "wealth") return (s.cash + s.stash) / m;
  return s.stats[key as StatKey];
}

export function hasFamily(s: GameState): boolean {
  return DATA.origin[s.character.origin]?.hasFamily ?? false;
}

/**
 * Returns the first unmet requirement as a lock reason, or null when everything passes.
 * (`chance` is ignored here — callers roll it separately.)
 */
export function checkConditions(
  c: Conditions | undefined,
  s: GameState,
  ctx: CondContext = {},
): LockReason | null {
  if (!c) return null;
  const traits = allTraits(s);
  const month = currentMonth(s);
  const city = cityOf(s);

  if (c.minDay !== undefined && s.day < c.minDay) return { key: "lock.minDay", vars: { n: c.minDay } };
  if (c.maxDay !== undefined && s.day > c.maxDay) return { key: "lock.generic" };
  if (c.minAge !== undefined && s.age < c.minAge) return { key: "lock.minAge", vars: { n: c.minAge } };
  if (c.maxAge !== undefined && s.age > c.maxAge) return { key: "lock.maxAge", vars: { n: c.maxAge } };
  if (c.ageGroups && !c.ageGroups.includes(ageGroupOf(s.age))) return { key: "lock.generic" };
  if (c.cities && !c.cities.includes(s.cityId)) return { key: "lock.generic" };
  if (c.notCities && c.notCities.includes(s.cityId)) return { key: "lock.generic" };
  if (c.climates && !c.climates.includes(city.climate)) return { key: "lock.generic" };
  if (c.origins && !c.origins.includes(s.character.origin)) return { key: "lock.generic" };
  if (c.spots && !(ctx.spotId && c.spots.includes(ctx.spotId))) return { key: "lock.generic" };
  if (c.scenes) {
    const spot = city.spots.find((sp) => sp.id === ctx.spotId);
    if (!spot || !c.scenes.includes(spot.scene)) return { key: "lock.generic" };
  }
  if (c.weather && !c.weather.includes(s.weather)) return { key: "lock.weather" };
  if (c.phases && !c.phases.includes(s.phase)) return { key: "lock.phase" };
  if (c.months && !c.months.includes(month)) return { key: "lock.generic" };
  if (c.inSeason) {
    const ok = c.inSeason.some(
      (season) =>
        (season === "hot" && city.hotMonths.includes(month)) ||
        (season === "wet" && city.wetMonths.includes(month)) ||
        (season === "cold" && city.coldMonths.includes(month)),
    );
    if (!ok) return { key: "lock.generic" };
  }
  if (c.festival !== undefined) {
    const on = activeFestivals(s).length > 0;
    if (on !== c.festival) return { key: "lock.generic" };
  }
  if (c.festivals) {
    const ids = activeFestivals(s).map((f) => f.id);
    if (!c.festivals.some((f) => ids.includes(f))) return { key: "lock.generic" };
  }
  if (c.traits) {
    const missing = c.traits.find((t) => !traits.includes(t));
    if (missing) return { key: "lock.trait", vars: { trait: missing } };
  }
  if (c.anyTraits && !c.anyTraits.some((t) => traits.includes(t)))
    return { key: "lock.anyTrait", vars: { traits: c.anyTraits.join("|") } };
  if (c.notTraits && c.notTraits.some((t) => traits.includes(t))) return { key: "lock.generic" };
  if (c.flags) {
    const missing = c.flags.find((f) => !s.flags.includes(f));
    if (missing) return { key: "lock.flag", vars: { flag: missing } };
  }
  if (c.anyFlags && !c.anyFlags.some((f) => s.flags.includes(f))) return { key: "lock.generic" };
  if (c.notFlags) {
    const blocking = c.notFlags.find((f) => s.flags.includes(f));
    if (blocking) return { key: "lock.notFlag", vars: { flag: blocking } };
  }
  if (c.items) {
    const missing = c.items.find((i) => !(s.items[i] > 0));
    if (missing) return { key: "lock.item", vars: { item: missing } };
  }
  if (c.notItems && c.notItems.some((i) => s.items[i] > 0)) return { key: "lock.generic" };
  if (c.min) {
    for (const [k, v] of Object.entries(c.min)) {
      if (v === undefined) continue;
      if (threshold(s, k as ThresholdKey) < v) return { key: `lock.min.${k}`, vars: { n: v } };
    }
  }
  if (c.max) {
    for (const [k, v] of Object.entries(c.max)) {
      if (v === undefined) continue;
      if (threshold(s, k as ThresholdKey) > v) return { key: `lock.max.${k}`, vars: { n: v } };
    }
  }
  if (c.counters) {
    for (const [k, v] of Object.entries(c.counters))
      if ((s.counters[k] ?? 0) < v) return { key: "lock.counter", vars: { counter: k, n: v } };
  }
  if (c.maxCounters) {
    for (const [k, v] of Object.entries(c.maxCounters))
      if ((s.counters[k] ?? 0) > v) return { key: "lock.generic" };
  }
  if (c.companion !== undefined && !!s.companion !== c.companion)
    return { key: c.companion ? "lock.companion" : "lock.generic" };
  if (c.hasFamily !== undefined && hasFamily(s) !== c.hasFamily) return { key: "lock.family" };
  if (c.sheltered !== undefined && s.sheltered !== c.sheltered) return { key: "lock.generic" };
  if (c.shelter && !c.shelter.includes(city.shelter)) return { key: "lock.generic" };
  if (c.afterActions && !(ctx.actionId && c.afterActions.includes(ctx.actionId)))
    return { key: "lock.generic" };
  return null;
}

export function meets(c: Conditions | undefined, s: GameState, ctx: CondContext = {}): boolean {
  return checkConditions(c, s, ctx) === null;
}
