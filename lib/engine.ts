// SPARE CHANGE game engine.
// Every exported function is PURE: (state, action) => new state. No React, no DOM, no Math.random.
// Randomness comes only from the seeded RNG whose state lives in GameState.rngState.

import th from "@/i18n/th.json";
import en from "@/i18n/en.json";
import { Rng } from "@/lib/rng";
import { DATA, DOG_NAMES } from "@/lib/data";
import {
  activeFestivals,
  ageGroupOf,
  checkConditions,
  cityOf,
  currentMonth,
  festivalBonus,
  hasTrait,
  allTraits,
  meets,
  type CondContext,
} from "@/lib/conditions";
import { fill, formatMoney, interpolate } from "@/lib/format";
import type {
  ActionDef,
  AgeGroup,
  Cause,
  Character,
  City,
  Deltas,
  Effects,
  GameAction,
  GameEvent,
  GameState,
  LockReason,
  Phase,
  Spot,
  StatKey,
  Strategy,
  TimelineEntry,
  Trait,
  Weather,
} from "@/types/game";
import { STAT_KEYS } from "@/types/game";

export const SAVE_VERSION = 3;
const MAX_LOG = 40;
const DAY_EVENT_CHANCE = 0.4;
const STALL_COST = 150;
const ID_FEE = 3;

type Dict = Record<string, string>;
const TH = th as Dict;
const EN = en as Dict;

function msg(key: string, vars: Record<string, string | number> = {}) {
  return {
    th: interpolate(TH[key] ?? key, vars),
    en: interpolate(EN[key] ?? key, vars),
  };
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

// ------------------------------------------------------------------ trait modifiers

type MulMod = "beg" | "busk" | "labor" | "energy" | "healthLoss" | "hopeLoss" | "heat" | "night" | "cold";

function traitDefs(s: GameState): Trait[] {
  return allTraits(s)
    .map((id) => DATA.trait[id])
    .filter(Boolean);
}

export function mod(s: GameState, key: MulMod): number {
  let m = 1;
  for (const t of traitDefs(s)) {
    const v = t.mods?.[key];
    if (typeof v === "number") m *= v;
  }
  return m;
}

export function luck(s: GameState): number {
  let l = 0;
  for (const t of traitDefs(s)) l += t.mods?.luck ?? 0;
  return l;
}

// ------------------------------------------------------------------ helpers

/** Luck shifts odds in proportion to how uncertain they are, so long shots stay long. */
export function luckyChance(base: number, l: number): number {
  return Math.max(0, Math.min(1, base + l * 2 * Math.min(base, 1 - base)));
}

function wealthMeals(s: GameState) {
  return (s.cash + s.stash) / cityOf(s).meal;
}

function hasFlag(s: GameState, f: string) {
  return s.flags.includes(f);
}

function addFlag(s: GameState, f: string) {
  if (!s.flags.includes(f)) s.flags.push(f);
}

function removeFlag(s: GameState, f: string) {
  s.flags = s.flags.filter((x) => x !== f);
}

function inc(s: GameState, key: string, n = 1) {
  s.counters[key] = (s.counters[key] ?? 0) + n;
}

function clampStats(s: GameState) {
  for (const k of STAT_KEYS) s.stats[k] = clamp(s.stats[k]);
  s.cash = Math.max(0, s.cash);
  s.stash = Math.max(0, s.stash);
}

function snap(s: GameState) {
  return { stats: { ...s.stats }, cash: s.cash, stash: s.stash, items: { ...s.items } };
}

function diff(before: ReturnType<typeof snap>, s: GameState): Deltas {
  const stats: Deltas["stats"] = {};
  for (const k of STAT_KEYS) {
    const d = Math.round(s.stats[k] - before.stats[k]);
    if (d !== 0) stats[k] = d;
  }
  const items: Record<string, number> = {};
  const ids = new Set([...Object.keys(before.items), ...Object.keys(s.items)]);
  ids.forEach((id) => {
    const d = (s.items[id] ?? 0) - (before.items[id] ?? 0);
    if (d !== 0) items[id] = d;
  });
  return { stats, cash: s.cash - before.cash, stash: s.stash - before.stash, items };
}

function pushLog(
  s: GameState,
  text: { th: string; en: string },
  tone: "good" | "bad" | "neutral",
  deltas?: Deltas,
) {
  s.log.unshift({ day: s.day, phase: s.phase, th: text.th, en: text.en, tone, deltas });
  if (s.log.length > MAX_LOG) s.log.length = MAX_LOG;
}

function pushTimeline(s: GameState, entry: Omit<TimelineEntry, "day" | "age">) {
  s.timeline.push({ day: s.day, age: s.age, ...entry });
}

function isDead(s: GameState) {
  return s.stats.health <= 0;
}

// ------------------------------------------------------------------ effects

export function applyEffects(s: GameState, rng: Rng, e?: Effects) {
  if (!e) return;
  const m = cityOf(s).meal;
  for (const k of STAT_KEYS) {
    const r = e[k];
    if (r === undefined) continue;
    let v = rng.range(r);
    if (k === "health" && v < 0) {
      v *= mod(s, "healthLoss");
      s.lastHarm = e.cause ?? "illness";
    }
    if (k === "hope" && v < 0) v *= mod(s, "hopeLoss");
    if (k === "heat" && v > 0) v *= mod(s, "heat");
    s.stats[k] += v;
  }
  if (e.cash !== undefined) {
    const v = rng.range(e.cash) * m;
    s.cash = Math.max(0, s.cash + v);
    if (v > 0) inc(s, "earnedMeals", v / m);
  }
  if (e.cashPct) s.cash = Math.max(0, s.cash * (1 + e.cashPct));
  if (e.stashPct) s.stash = Math.max(0, s.stash * (1 + e.stashPct));
  if (e.items) {
    for (const [id, n] of Object.entries(e.items)) {
      const v = Math.max(0, (s.items[id] ?? 0) + n);
      if (v > 0) s.items[id] = v;
      else delete s.items[id];
    }
  }
  e.flags?.forEach((f) => addFlag(s, f));
  e.unflags?.forEach((f) => removeFlag(s, f));
  if (e.counters) for (const [k, v] of Object.entries(e.counters)) inc(s, k, v);
  if (e.counters?.idProgress) checkIdDone(s);
  e.addTraits?.forEach((t) => {
    if (!s.character.traits.includes(t)) s.character.traits.push(t);
  });
  if (e.companion === true && !s.companion) gainDog(s, rng);
  if (e.companion === false && s.companion) s.companion = null;
  if (e.sheltered !== undefined) s.sheltered = e.sheltered;
  clampStats(s);
}

function gainDog(s: GameState, rng: Rng) {
  const n = rng.pick(DOG_NAMES);
  s.companion = { kind: "dog", name_th: n.th, name_en: n.en, since: s.day };
  pushTimeline(s, {
    icon: "🐕",
    kind: "life",
    th: interpolate(TH["tl.dog"], { dog: n.th }),
    en: interpolate(EN["tl.dog"], { dog: n.en }),
  });
}

// ------------------------------------------------------------------ world

function rollWeather(s: GameState, rng: Rng): Weather {
  const city = cityOf(s);
  const month = currentMonth(s);
  const r = rng.next();
  if (city.coldMonths.includes(month)) {
    if (city.snow && r < 0.22) return "snow";
    if (r < 0.65) return "cold";
    if (r < 0.8) return "rain";
    return r < 0.9 ? "cloudy" : "clear";
  }
  if (city.wetMonths.includes(month)) {
    const storm = city.climate === "monsoon" ? 0.16 : 0.1;
    if (r < storm) return "storm";
    if (r < 0.6) return "rain";
    return r < 0.82 ? "cloudy" : "clear";
  }
  if (city.hotMonths.includes(month)) {
    if (r < 0.55) return "heat";
    return r < 0.72 ? "cloudy" : "clear";
  }
  if (r < 0.15) return "rain";
  return r < 0.4 ? "cloudy" : "clear";
}

// ------------------------------------------------------------------ new game

const AGE_GROUPS: { g: AgeGroup; w: number; min: number; max: number }[] = [
  { g: "child", w: 15, min: 8, max: 14 },
  { g: "young", w: 30, min: 15, max: 24 },
  { g: "adult", w: 40, min: 25, max: 49 },
  { g: "elder", w: 15, min: 50, max: 70 },
];

const SKINS = ["#f5d0b0", "#e8b98f", "#c98e62", "#a5694a", "#7d4b32", "#5a3523"];
const HAIRS = ["#1b1410", "#3b2416", "#6b4423", "#a87b4f", "#2b2b2b"];
const SHIRTS = ["#b4443a", "#3d6b8f", "#5f7f3f", "#8c6d3f", "#6b4f8a", "#a8a39a", "#c07a2c", "#3f4a5a"];
const PANTS = ["#3a3f4b", "#4b3a2a", "#2f3a2f", "#55504a", "#2a3550"];

export function newGame(seed: number): GameState {
  const rng = new Rng(seed);
  const cityTotal = DATA.cities.reduce((a, c) => a + c.weight, 0);
  const city = rng.weighted(DATA.cities, (c) => c.weight) ?? DATA.cities[0];
  const ag = rng.weighted(AGE_GROUPS, (a) => a.w) ?? AGE_GROUPS[2];

  let pool = DATA.origins.filter(
    (o) => o.ageGroups.includes(ag.g) && (!o.cities || o.cities.includes(city.id)),
  );
  if (pool.length === 0) pool = DATA.origins.filter((o) => o.ageGroups.includes(ag.g));
  if (pool.length === 0) pool = DATA.origins;
  const poolTotal = pool.reduce((a, o) => a + o.weight, 0);
  const origin = rng.weighted(pool, (o) => o.weight) ?? pool[0];

  const lo = Math.max(ag.min, origin.minAge ?? 0);
  const hi = Math.min(ag.max, origin.maxAge ?? 200);
  const age = lo <= hi ? rng.int(lo, hi) : rng.int(ag.min, ag.max);

  const name = rng.pick(city.names);

  const traitPool = DATA.traits.filter((t) => !t.hidden);
  const traitTotal = traitPool.reduce((a, t) => a + t.weight, 0);
  const traits: string[] = [];
  let traitP = 1;
  while (traits.length < 2 && traits.length < traitPool.length) {
    const t = rng.weighted(
      traitPool.filter((x) => !traits.includes(x.id)),
      (x) => x.weight,
    );
    if (!t) break;
    traitP *= t.weight / traitTotal;
    traits.push(t.id);
  }
  traitP *= 2; // order doesn't matter
  const hiddenTraits: string[] = [];
  if (origin.grantTrait) {
    const gt = DATA.trait[origin.grantTrait];
    if (gt?.hidden) hiddenTraits.push(gt.id);
    else if (gt && !traits.includes(gt.id)) traits.push(gt.id);
  }

  const p = (city.weight / cityTotal) * (ag.w / 100) * (origin.weight / poolTotal) * traitP;
  const oneIn = Math.max(2, Math.round(1 / p));

  const character: Character = {
    name_th: name.th,
    name_en: name.en,
    gender: name.g,
    ageStart: age,
    ageGroup: ag.g,
    origin: origin.id,
    traits,
    hiddenTraits,
    appearance: {
      skin: rng.pick(SKINS),
      hair: ag.g === "elder" ? rng.pick(["#c9c4bd", "#9e9891", "#e6e1da"]) : rng.pick(HAIRS),
      shirt: rng.pick(SHIRTS),
      pants: rng.pick(PANTS),
      hairStyle: name.g === "f" ? rng.pick([1, 1, 2, 0]) : rng.pick([0, 0, 2, 3]),
    },
    oneIn,
  };

  const stats: Record<StatKey, number> = {
    health: 80,
    hunger: 60,
    thirst: 60,
    hygiene: 50,
    hope: 50,
    energy: 80,
    rep: 5,
    heat: 0,
  };
  if (ag.g === "elder") stats.health -= 10;
  if (ag.g === "child") stats.hope += 10;
  for (const [k, v] of Object.entries(origin.stats ?? {})) stats[k as StatKey] += v ?? 0;

  const s: GameState = {
    version: SAVE_VERSION,
    seed,
    rngState: 0,
    revealed: false,
    character,
    cityId: city.id,
    citiesLived: [city.id],
    day: 1,
    phase: "morning",
    startDoy: rng.int(0, 364),
    age,
    stats,
    cash: Math.round(origin.cash * city.meal * rng.float(0.8, 1.2)),
    stash: 0,
    items: { ...(origin.items ?? {}) },
    flags: [...(origin.flags ?? [])],
    counters: {},
    companion: null,
    weather: "clear",
    sheltered: false,
    lastSpot: null,
    lastHarm: "illness",
    eventQueue: [],
    pendingEvent: null,
    eventResult: null,
    eventHistory: {},
    log: [],
    timeline: [],
    milestones: [],
    newMilestones: [],
    summary: null,
    ended: null,
  };
  clampStats(s);
  s.weather = rollWeather(s, rng);
  pushTimeline(s, {
    icon: city.flag,
    kind: "start",
    th: `${origin.name_th} — ${interpolate(TH["tl.start"], { city: city.name_th, age })}`,
    en: `${origin.name_en} — ${interpolate(EN["tl.start"], { city: city.name_en, age })}`,
  });
  pushLog(
    s,
    {
      th: interpolate(TH["log.start"], { city: city.name_th }),
      en: interpolate(EN["log.start"], { city: city.name_en }),
    },
    "neutral",
  );
  s.rngState = rng.state;
  return s;
}

// ------------------------------------------------------------------ action availability

export interface ActionView {
  def: ActionDef;
  lock: LockReason | null;
  energy: number;
}

export function energyCost(s: GameState, def: ActionDef): number {
  if (def.energy <= 0) return 0;
  let e = def.energy * mod(s, "energy");
  if (hasFlag(s, "sick")) e *= 1.25;
  if (s.character.ageGroup === "elder" && ageGroupOf(s.age) === "elder" && s.age >= 65) e *= 1.1;
  return Math.round(e);
}

function actionCost(s: GameState, def: ActionDef): number {
  if (def.kind === "clinic" && (s.items.medicine ?? 0) > 0) return 0;
  return def.cost ?? 0;
}

export function actionViews(s: GameState): ActionView[] {
  const out: ActionView[] = [];
  const city = cityOf(s);
  for (const def of DATA.actions) {
    if (!def.phases.includes(s.phase)) continue;
    if (def.visible && !meets(def.visible, s)) continue;
    const energy = energyCost(s, def);
    let lock = checkConditions(def.requires, s);
    const cost = actionCost(s, def);
    if (!lock && cost > 0 && s.cash < cost * city.meal - 1e-9)
      lock = { key: "lock.cash", vars: { amount: formatMoney(cost * city.meal, city) } };
    if (!lock && energy > s.stats.energy) lock = { key: "lock.energy" };
    if (!lock && def.pickSpot && spotViews(s).every((sv) => sv.lock)) lock = { key: "lock.generic" };
    out.push({ def, lock, energy });
  }
  return out;
}

export function spotViews(s: GameState): { spot: Spot; lock: LockReason | null }[] {
  return cityOf(s).spots.map((spot) => ({
    spot,
    lock:
      spot.minRep && s.stats.rep < spot.minRep
        ? { key: "lock.min.rep", vars: { n: spot.minRep } }
        : null,
  }));
}

// ------------------------------------------------------------------ income

function sessionBase(city: City, rng: Rng) {
  return rng.float(city.dailyIncome[0], city.dailyIncome[1]) / 3;
}

function hygieneFactor(s: GameState) {
  return 0.55 + (0.6 * s.stats.hygiene) / 100;
}

function repFactor(s: GameState) {
  return 0.85 + (0.4 * s.stats.rep) / 100;
}

function weatherFactor(w: Weather) {
  if (w === "storm") return 0.4;
  if (w === "rain") return 0.7;
  if (w === "snow") return 0.75;
  return 1;
}

function nightFactor(s: GameState) {
  return s.phase === "night" ? 0.6 * mod(s, "night") : 1;
}

function begIncome(s: GameState, rng: Rng, spot: Spot) {
  const city = cityOf(s);
  let v = sessionBase(city, rng) * spot.income;
  v *= hygieneFactor(s) * repFactor(s) * festivalBonus(s) * rng.float(0.5, 1.5);
  v *= mod(s, "beg") * weatherFactor(s.weather) * nightFactor(s);
  const g = ageGroupOf(s.age);
  if (g === "child") v *= 1.15;
  if (g === "elder") v *= 1.1;
  if (s.companion) v *= 1.1;
  return v;
}

function buskIncome(s: GameState, rng: Rng, spot: Spot) {
  const city = cityOf(s);
  let v = sessionBase(city, rng) * spot.income * 1.3 * (0.7 + spot.tourists * 0.8);
  v *= (0.75 + 0.25 * hygieneFactor(s)) * repFactor(s) * festivalBonus(s) * rng.float(0.5, 1.6);
  v *= mod(s, "busk") * weatherFactor(s.weather) * nightFactor(s);
  return v;
}

// ------------------------------------------------------------------ actions

function idStepsNeeded(s: GameState) {
  return hasTrait(s, "undocumented") ? 5 : 3;
}

function performAction(s: GameState, rng: Rng, actionId: string, spotId?: string): boolean {
  const view = actionViews(s).find((v) => v.def.id === actionId);
  if (!view || view.lock) return false;
  const def = view.def;
  const city = cityOf(s);
  const m = city.meal;

  let spot: Spot | null = null;
  if (def.pickSpot) {
    const open = spotViews(s).filter((sv) => !sv.lock);
    spot = open.find((sv) => sv.spot.id === spotId)?.spot ?? open[0]?.spot ?? null;
    if (!spot) return false;
    s.lastSpot = spot.id;
  }

  const before = snap(s);
  s.stats.energy -= view.energy;
  const cost = actionCost(s, def);
  if (cost > 0) s.cash -= cost * m;
  applyEffects(s, rng, def.effects);
  inc(s, `do_${def.kind}`);

  let tone: "good" | "bad" | "neutral" = "neutral";
  const extra: { th: string; en: string }[] = [];
  const add = (key: string, vars: Record<string, string | number> = {}) => extra.push(msg(key, vars));
  let amount = 0;

  switch (def.kind) {
    case "beg": {
      amount = begIncome(s, rng, spot!);
      s.stats.heat += spot!.police * 7 * mod(s, "heat");
      s.stats.rep += 0.4;
      inc(s, "begs");
      break;
    }
    case "busk": {
      amount = buskIncome(s, rng, spot!);
      s.stats.heat += spot!.police * 3 * mod(s, "heat");
      s.stats.rep += 0.8;
      inc(s, "busks");
      break;
    }
    case "sell": {
      const goods = s.items.goods ?? 0;
      const sold = Math.min(goods, rng.int(3, 6));
      s.items.goods = goods - sold;
      if (s.items.goods <= 0) delete s.items.goods;
      amount =
        sold * m * 0.6 * (0.8 + spot!.tourists * 0.5) * (0.7 + 0.3 * hygieneFactor(s)) *
        festivalBonus(s) * weatherFactor(s.weather) * rng.float(0.8, 1.2);
      s.stats.heat += spot!.police * 2;
      add("res.sold", { n: sold });
      break;
    }
    case "recycle":
      amount = rng.float(0.7, 1.6) * m * (s.weather === "heat" ? 0.9 : 1);
      break;
    case "labor": {
      amount = rng.float(2.5, 4.0) * m * mod(s, "labor");
      inc(s, "laborDays");
      const injuryP = 0.05 * (hasTrait(s, "bad_knee") ? 2.5 : 1) * (hasTrait(s, "tough") ? 0.5 : 1);
      if (rng.chance(injuryP)) {
        addFlag(s, "injured");
        s.stats.health -= 8;
        s.lastHarm = "injury";
        add("res.injured");
        tone = "bad";
      }
      break;
    }
    case "work":
      amount = rng.float(3.0, 4.2) * m * (s.weather === "storm" ? 0.8 : 1);
      inc(s, "workDays");
      break;
    case "gamble": {
      const stake = Math.min(s.cash, 2 * m);
      s.cash -= stake;
      const r = rng.next();
      const l = luck(s);
      if (r < 0.05 + l / 2) {
        amount = stake * 5;
        add("res.gamble.jackpot");
        inc(s, "gambleWins");
        tone = "good";
      } else if (r < 0.38 + l) {
        amount = stake * 2;
        add("res.gamble.win");
        inc(s, "gambleWins");
      } else {
        add("res.gamble.lose", { amount: formatMoney(stake, city) });
        inc(s, "gambleLosses");
        s.stats.hope -= hasTrait(s, "gambler") ? 6 : 3;
        tone = "bad";
      }
      break;
    }
    case "sleep": {
      let e = s.sheltered ? 75 : 50;
      if (s.items.sleeping_bag) e += 8;
      else if (s.items.blanket) e += 4;
      if (s.companion) e += 3;
      if (!s.sheltered && (s.weather === "cold" || s.weather === "snow" || s.weather === "storm")) e -= 12;
      s.stats.energy += e;
      if (s.stats.hunger > 30 && s.stats.thirst > 30) s.stats.health += s.sheltered ? 6 : 2;
      if (s.sheltered) {
        s.stats.hygiene += 10;
        inc(s, "nightsShelter");
        add("res.sleep.shelter");
        tone = "good";
      } else if (hasFlag(s, "has_housing")) {
        add("res.sleep.room");
      }
      break;
    }
    case "rest":
      if (hasFlag(s, "sick") && rng.chance(0.15)) {
        removeFlag(s, "sick");
        add("res.recovered");
        tone = "good";
      }
      break;
    case "wash":
      if (s.weather === "cold" || s.weather === "snow") {
        s.stats.hope -= 2;
        s.stats.health -= 1;
        add("res.wash.cold");
      }
      break;
    case "clinic": {
      if (cost === 0 && (s.items.medicine ?? 0) > 0) {
        s.items.medicine -= 1;
        if (s.items.medicine <= 0) delete s.items.medicine;
        add("res.clinic.medicine");
      }
      if (hasFlag(s, "sick") || hasFlag(s, "injured")) add("res.recovered");
      removeFlag(s, "sick");
      removeFlag(s, "injured");
      tone = "good";
      break;
    }
    case "ngo": {
      const base = { low: 0.2, medium: 0.45, high: 0.7 }[city.shelter];
      const p = base * (ageGroupOf(s.age) === "child" ? 1.6 : 1) * (1 + s.stats.rep / 200);
      if (!s.sheltered && rng.chance(p)) {
        s.sheltered = true;
        add("res.ngo.bed");
        tone = "good";
      } else if (!s.sheltered) add("res.ngo.full");
      if (rng.chance(0.6)) {
        s.stats.hygiene += 25;
        add("res.ngo.shower");
      }
      if ((hasFlag(s, "sick") || hasFlag(s, "injured")) && rng.chance(0.55)) {
        removeFlag(s, "sick");
        removeFlag(s, "injured");
        s.stats.health += 10;
        add("res.ngo.medic");
      }
      const idp = s.counters.idProgress ?? 0;
      if (!hasFlag(s, "has_id") && idp > 0 && rng.chance(0.2)) {
        inc(s, "idProgress");
        add("res.ngo.paperwork");
        checkIdDone(s);
      }
      break;
    }
    case "talk":
      if (rng.chance(0.22 + s.stats.rep / 400)) {
        inc(s, "friends");
        add("res.talk.friend");
        tone = "good";
      }
      break;
    case "dog":
      if (!s.companion) {
        inc(s, "dogCare");
        if ((s.counters.dogCare ?? 0) >= 3) {
          gainDog(s, rng);
          extra.push({
            th: interpolate(TH["res.dog.adopt"], { dog: s.companion!.name_th }),
            en: interpolate(EN["res.dog.adopt"], { dog: s.companion!.name_en }),
          });
          tone = "good";
        } else add("res.dog.progress", { n: s.counters.dogCare ?? 0 });
      } else {
        s.stats.hope += 5;
        extra.push({
          th: interpolate(TH["res.dog.play"], { dog: s.companion.name_th }),
          en: interpolate(EN["res.dog.play"], { dog: s.companion.name_en }),
        });
      }
      break;
    case "call_family":
      inc(s, "familyCalls");
      if (rng.chance(0.55 + s.stats.hope / 400)) {
        s.stats.hope += 10;
        add("res.call.warm");
        tone = "good";
      } else {
        s.stats.hope -= 6;
        add("res.call.hard");
        tone = "bad";
      }
      break;
    case "save":
      s.stash += s.cash;
      s.cash = 0;
      add("res.save", { amount: formatMoney(s.stash, city) });
      break;
    case "withdraw":
      s.cash += s.stash;
      s.stash = 0;
      break;
    case "apply_id": {
      const total = idStepsNeeded(s);
      const step = (s.counters.idProgress ?? 0) + 1;
      if (step === 2 && s.stats.hygiene < 30) {
        add("res.id.dirty");
        tone = "bad";
        break;
      }
      if (step === total && s.cash < ID_FEE * m) {
        add("res.id.fee", { amount: formatMoney(ID_FEE * m, city) });
        tone = "bad";
        break;
      }
      const p = 0.65 + (hasFlag(s, "in_system") ? 0.15 : 0) + s.stats.rep / 500 + luck(s);
      if (rng.chance(p)) {
        if (step === total) s.cash -= ID_FEE * m;
        inc(s, "idProgress");
        add("res.id.step", { n: step, total });
        tone = "good";
        checkIdDone(s);
      } else {
        add(rng.pick(["res.id.fail1", "res.id.fail2", "res.id.fail3"]));
        tone = "bad";
      }
      break;
    }
    case "move_city": {
      const others = DATA.cities.filter((c) => c.id !== s.cityId);
      const next = rng.weighted(others, (c) => c.weight) ?? others[0];
      const ratio = next.meal / m;
      s.cash *= ratio;
      s.stash *= ratio;
      s.cityId = next.id;
      if (!s.citiesLived.includes(next.id)) s.citiesLived.push(next.id);
      s.stats.rep = 5;
      s.stats.heat = 0;
      s.lastSpot = null;
      ["has_job", "has_housing", "job_waiting", "regular_donor", "awning_friend", "vendor_friend"].forEach((f) =>
        removeFlag(s, f),
      );
      s.weather = rollWeather(s, rng);
      extra.push({
        th: interpolate(TH["res.move"], { city: next.name_th }),
        en: interpolate(EN["res.move"], { city: next.name_en }),
      });
      pushTimeline(s, {
        icon: next.flag,
        kind: "life",
        th: interpolate(TH["tl.move"], { city: next.name_th }),
        en: interpolate(EN["tl.move"], { city: next.name_en }),
      });
      break;
    }
    case "rent_room":
      addFlag(s, "has_housing");
      pushTimeline(s, { icon: "🏠", kind: "life", ...msg("tl.room") });
      tone = "good";
      break;
    case "open_stall": {
      let need = STALL_COST * m;
      const fromCash = Math.min(s.cash, need);
      s.cash -= fromCash;
      need -= fromCash;
      s.stash = Math.max(0, s.stash - need);
      addFlag(s, "opened_stall");
      pushTimeline(s, { icon: "🏪", kind: "life", ...msg("tl.stall") });
      tone = "good";
      break;
    }
    default:
      break;
  }

  if (amount > 0) {
    s.cash += amount;
    inc(s, "earnedMeals", amount / m);
    if (tone === "neutral") tone = "good";
  }
  clampStats(s);

  const i = rng.int(0, Math.max(0, def.flavor_th.length - 1));
  const vars = {
    amount: formatMoney(amount, city),
  };
  const textTh = fill(interpolate(def.flavor_th[i] ?? "", vars), s, "th");
  const textEn = fill(interpolate(def.flavor_en[i] ?? def.flavor_th[i] ?? "", vars), s, "en");
  pushLog(
    s,
    {
      th: [textTh, ...extra.map((e) => e.th)].filter(Boolean).join(" "),
      en: [textEn, ...extra.map((e) => e.en)].filter(Boolean).join(" "),
    },
    tone,
    diff(before, s),
  );

  endPhase(s, rng, def, spot);
  return true;
}

function checkIdDone(s: GameState) {
  if (hasFlag(s, "has_id")) return;
  if ((s.counters.idProgress ?? 0) >= idStepsNeeded(s)) {
    addFlag(s, "has_id");
    s.items.id_card = 1;
    removeFlag(s, "lost_documents");
  }
}

// ------------------------------------------------------------------ phase & day flow

function phaseDecay(s: GameState) {
  const w = s.weather;
  s.stats.hunger -= 7;
  s.stats.thirst -= w === "heat" ? 13 : 9;
  s.stats.hygiene -= 3;
  if (w === "heat" && s.phase !== "night") s.stats.energy -= 3;

  const harms: [number, Cause][] = [];
  if (s.stats.hunger <= 0) harms.push([9, "hunger"]);
  else if (s.stats.hunger < 15) harms.push([3, "hunger"]);
  if (s.stats.thirst <= 0) harms.push([11, "hunger"]);
  else if (s.stats.thirst < 15) harms.push([4, "hunger"]);
  if (w === "heat" && s.stats.thirst < 30 && s.phase !== "night") harms.push([5, "heat"]);
  if (hasFlag(s, "sick")) harms.push([3, "illness"]);
  if (hasFlag(s, "injured")) harms.push([2, "injury"]);

  if (harms.length) {
    const total = harms.reduce((a, h) => a + h[0], 0) * mod(s, "healthLoss");
    s.stats.health -= total;
    harms.sort((a, b) => b[0] - a[0]);
    s.lastHarm = harms[0][1];
  } else if (s.stats.hunger >= 45 && s.stats.thirst >= 45) {
    s.stats.health += 1.5;
  }
  clampStats(s);
}

function nightExposure(s: GameState, rng: Rng, slept: boolean) {
  if (s.sheltered || hasFlag(s, "has_housing")) return;
  const w = s.weather;
  const city = cityOf(s);
  const has = (id: string) => (s.items[id] ?? 0) > 0;
  let hurt = 0;
  let cause: Cause = "cold";
  if (w === "cold" || w === "snow") {
    let dmg = w === "snow" ? rng.int(14, 22) : rng.int(7, 12);
    dmg -= (has("sleeping_bag") ? 7 : 0) + (has("blanket") ? 4 : 0) + (has("warm_coat") ? 5 : 0);
    dmg -= (has("cardboard") ? 2 : 0) + (s.companion ? 2 : 0);
    if (!slept) dmg *= 0.75;
    hurt = Math.max(0, dmg) * mod(s, "cold");
    s.stats.hope -= 2;
    if (hurt > 0) pushLog(s, msg("log.coldNight"), "bad");
  } else if (w === "storm") {
    hurt = Math.max(0, rng.int(4, 9) - (has("raincoat") ? 3 : 0) - (has("umbrella") ? 1 : 0));
    cause = "storm";
    s.stats.hygiene -= 10;
    if (has("cardboard") && rng.chance(0.3)) delete s.items.cardboard;
    pushLog(s, msg("log.stormNight"), "bad");
  } else if (w === "rain") {
    s.stats.hygiene -= 6;
    if (!has("raincoat") && !has("umbrella")) hurt = 2;
  } else if (city.coldMonths.includes(currentMonth(s)) && !has("blanket") && !has("sleeping_bag")) {
    hurt = 2;
  }
  if (hurt > 0) {
    s.stats.health -= hurt * mod(s, "healthLoss");
    s.lastHarm = cause;
  }
  clampStats(s);
}

function endPhase(s: GameState, rng: Rng, def: ActionDef | null, spot: Spot | null) {
  phaseDecay(s);
  if (s.phase === "night") {
    const slept = def?.kind === "sleep";
    nightExposure(s, rng, slept);
    if (!slept) {
      s.stats.energy += 6;
      s.stats.hope -= 2;
      pushLog(s, msg("log.noSleep"), "bad");
    }
  }
  if (!isDead(s) && def) {
    const p = def.eventChance + (spot ? spot.risk * 0.15 : 0);
    if (rng.chance(p)) queueRandomEvent(s, rng, "action", { actionId: def.id, spotId: spot?.id ?? null });
  }
  if (s.phase === "morning") s.phase = "afternoon";
  else if (s.phase === "afternoon") s.phase = "night";
  else newDay(s, rng);
  clampStats(s);
}

function newDay(s: GameState, rng: Rng) {
  s.day += 1;
  s.phase = "morning";
  s.sheltered = false;
  s.weather = rollWeather(s, rng);

  if ((s.day - 1) % 365 === 0) {
    s.age += 1;
    pushTimeline(s, { icon: "🎂", kind: "life", ...msg("tl.birthday", { age: s.age }) });
    queueRandomEvent(s, rng, "birthday", {});
  }

  s.stats.heat -= 4;
  s.stats.hope -= 1 * mod(s, "hopeLoss");
  if (s.companion) s.stats.hope += 1;
  if (hasFlag(s, "has_housing")) s.stats.hygiene += 20;

  if (!hasFlag(s, "sick")) {
    let p = s.stats.hygiene < 30 ? 0.07 : s.stats.hygiene < 50 ? 0.02 : 0.005;
    const city = cityOf(s);
    if (city.wetMonths.includes(currentMonth(s))) p += 0.015;
    if (s.weather === "cold" || s.weather === "snow") p += 0.02;
    if (rng.chance(p)) {
      addFlag(s, "sick");
      pushLog(s, msg("log.sick"), "bad");
    }
  } else if (s.stats.health > 40 && rng.chance(0.08)) {
    removeFlag(s, "sick");
    pushLog(s, msg("log.recovered"), "good");
  }
  if (hasFlag(s, "injured") && rng.chance(0.12)) {
    removeFlag(s, "injured");
    pushLog(s, msg("log.healed"), "good");
  }

  if (s.age >= 70 && rng.chance((s.age - 69) * 0.0006)) {
    s.stats.health = 0;
    s.lastHarm = "age";
  }

  if (isDead(s)) return;

  // forced events: first match fires, once.
  for (const ev of DATA.events) {
    if (!ev.forced || s.eventHistory[ev.id] !== undefined) continue;
    if (ev.trigger !== "day" && ev.trigger !== "any") continue;
    if (s.eventQueue.includes(ev.id)) continue;
    if (!meets(ev.conditions, s, { spotId: s.lastSpot })) continue;
    s.eventHistory[ev.id] = s.day;
    s.eventQueue.push(ev.id);
    break;
  }

  if (rng.chance(DAY_EVENT_CHANCE)) queueRandomEvent(s, rng, "day", { spotId: s.lastSpot });
}

// ------------------------------------------------------------------ events

function eventEligible(s: GameState, rng: Rng, ev: GameEvent, ctx: CondContext): boolean {
  if (ev.once && s.eventHistory[ev.id] !== undefined) return false;
  const last = s.eventHistory[ev.id];
  if (last !== undefined && s.day - last < (ev.cooldown ?? 6)) return false;
  if (s.eventQueue.includes(ev.id) || s.pendingEvent === ev.id) return false;
  if (!meets(ev.conditions, s, ctx)) return false;
  if (ev.conditions?.chance !== undefined && !rng.chance(ev.conditions.chance)) return false;
  return true;
}

function queueRandomEvent(
  s: GameState,
  rng: Rng,
  trigger: "day" | "action" | "birthday",
  ctx: CondContext,
) {
  const spot = cityOf(s).spots.find((sp) => sp.id === ctx.spotId);
  const pool = DATA.events.filter(
    (e) =>
      !e.forced &&
      (e.trigger === trigger || (e.trigger === "any" && trigger !== "birthday")) &&
      eventEligible(s, rng, e, ctx),
  );
  const ev = rng.weighted(pool, (e) => {
    let w = e.weight;
    if (e.tags.includes("danger")) w *= 1 + (spot?.risk ?? 0.3) * 2;
    if (e.tags.includes("authority")) w *= 1 + s.stats.heat / 30;
    if (e.tags.includes("health") && s.stats.hygiene < 30) w *= 1.5;
    if (e.tags.includes("kindness") && s.companion) w *= 1.15;
    return w;
  });
  if (!ev) return;
  s.eventHistory[ev.id] = s.day;
  s.eventQueue.push(ev.id);
}

function chooseEvent(s: GameState, rng: Rng, idx: number): boolean {
  if (!s.pendingEvent || s.eventResult) return false;
  const ev = DATA.event[s.pendingEvent];
  if (!ev) {
    s.pendingEvent = s.eventQueue.shift() ?? null;
    return true;
  }
  const choice = ev.choices[idx];
  if (!choice || !meets(choice.requires, s)) return false;
  const before = snap(s);
  applyEffects(s, rng, choice.effects);
  let textTh = choice.text_th ?? "";
  let textEn = choice.text_en ?? "";
  let success: boolean | undefined;
  if (choice.chance !== undefined && choice.success && choice.fail) {
    success = rng.chance(luckyChance(choice.chance, luck(s)));
    const o = success ? choice.success : choice.fail;
    applyEffects(s, rng, o.effects);
    textTh = o.text_th;
    textEn = o.text_en;
  }
  textTh = fill(textTh, s, "th");
  textEn = fill(textEn, s, "en");
  s.eventResult = {
    eventId: ev.id,
    title_th: ev.title_th,
    title_en: ev.title_en,
    icon: ev.icon,
    text_th: textTh,
    text_en: textEn,
    success,
    deltas: diff(before, s),
  };
  s.pendingEvent = null;
  if (ev.major) {
    pushTimeline(s, {
      icon: ev.icon,
      kind: "event",
      th: `${ev.title_th} — ${fill(choice.label_th, s, "th")}`,
      en: `${ev.title_en} — ${fill(choice.label_en, s, "en")}`,
    });
  }
  pushLog(
    s,
    { th: `${ev.icon} ${ev.title_th}: ${fill(choice.label_th, s, "th")}`, en: `${ev.icon} ${ev.title_en}: ${fill(choice.label_en, s, "en")}` },
    success === false ? "bad" : "neutral",
    s.eventResult.deltas,
  );
  return true;
}

// ------------------------------------------------------------------ milestones & endings

interface MilestoneDef {
  id: string;
  icon: string;
  test: (s: GameState) => boolean;
}

export const MILESTONES: MilestoneDef[] = [
  { id: "first_week", icon: "📅", test: (s) => s.day >= 8 },
  { id: "first_cash", icon: "💰", test: (s) => s.cash + s.stash >= cityOf(s).milestoneCash },
  { id: "first_friend", icon: "🤝", test: (s) => (s.counters.friends ?? 0) >= 1 },
  { id: "first_shelter", icon: "🛏️", test: (s) => (s.counters.nightsShelter ?? 0) >= 1 },
  { id: "companion", icon: "🐕", test: (s) => !!s.companion },
  { id: "first_month", icon: "🗓️", test: (s) => s.day >= 31 },
  { id: "id_obtained", icon: "🪪", test: (s) => hasFlag(s, "has_id") },
  { id: "first_job", icon: "👷", test: (s) => hasFlag(s, "has_job") },
  { id: "one_year", icon: "🎉", test: (s) => s.day >= 366 },
  { id: "five_years", icon: "🏅", test: (s) => s.day >= 1826 },
  { id: "ten_years", icon: "👑", test: (s) => s.day >= 3651 },
];

function checkMilestones(s: GameState) {
  for (const m of MILESTONES) {
    if (s.milestones.includes(m.id) || !m.test(s)) continue;
    s.milestones.push(m.id);
    s.newMilestones.push(m.id);
    const city = cityOf(s);
    const vars = { amount: formatMoney(city.milestoneCash, city) };
    pushTimeline(s, { icon: m.icon, kind: "milestone", ...msg(`milestone.${m.id}`, vars) });
  }
}

function endGame(s: GameState, endingId: string) {
  const ending = DATA.ending[endingId];
  s.ended = { endingId, day: s.day, age: s.age };
  s.eventQueue = [];
  s.pendingEvent = null;
  if (ending)
    pushTimeline(s, { icon: ending.icon, kind: "ending", th: ending.title_th, en: ending.title_en });
}

function checkEndings(s: GameState) {
  if (s.ended) return;
  if (isDead(s)) {
    const cause = s.lastHarm === "injury" ? "illness" : s.lastHarm;
    const match =
      DATA.endings.find((e) => e.death?.includes(cause) && meets(e.conditions, s)) ??
      DATA.endings.find((e) => e.death?.includes("illness")) ??
      DATA.endings.find((e) => e.death);
    if (match) endGame(s, match.id);
    return;
  }
  if (s.pendingEvent || s.eventResult) return;
  const living = DATA.endings.find((e) => !e.death && e.conditions && meets(e.conditions, s));
  if (living) endGame(s, living.id);
}

function finalize(s: GameState) {
  if (!s.pendingEvent && !s.eventResult && s.eventQueue.length && !s.ended)
    s.pendingEvent = s.eventQueue.shift() ?? null;
  checkMilestones(s);
  checkEndings(s);
}

// ------------------------------------------------------------------ auto-simulation

function midpoint(r: unknown): number {
  if (typeof r === "number") return r;
  if (Array.isArray(r)) return (r[0] + r[1]) / 2;
  return 0;
}

const SHADY_FLAGS = ["shady_member", "kept_wallet", "informant", "stole_food", "passed_fake"];

function scoreEffects(s: GameState, e: Effects | undefined, strategy: Strategy): number {
  if (!e) return 0;
  const heatW = strategy === "safe" ? 1.4 : strategy === "balanced" ? 0.7 : 0.2;
  const cashW = strategy === "safe" ? 3 : strategy === "balanced" ? 4 : 6;
  let v =
    midpoint(e.health) * (s.stats.health < 40 ? 2 : 1.1) +
    midpoint(e.hunger) * 0.4 +
    midpoint(e.thirst) * 0.4 +
    midpoint(e.hygiene) * 0.2 +
    midpoint(e.hope) * 0.6 +
    midpoint(e.energy) * 0.15 +
    midpoint(e.rep) * 0.5 -
    midpoint(e.heat) * heatW +
    midpoint(e.cash) * cashW +
    (e.cashPct ?? 0) * 20 * cashW / 3 +
    (e.stashPct ?? 0) * 25;
  if (e.flags?.some((f) => SHADY_FLAGS.includes(f)))
    v -= strategy === "safe" ? 60 : strategy === "balanced" ? 35 : 8;
  if (e.companion === false) v -= 30;
  return v;
}

function autoChoice(s: GameState, strategy: Strategy): number {
  const ev = s.pendingEvent ? DATA.event[s.pendingEvent] : null;
  if (!ev) return 0;
  let best = -1;
  let bestScore = -Infinity;
  ev.choices.forEach((c, i) => {
    if (!meets(c.requires, s)) return;
    let sc = scoreEffects(s, c.effects, strategy);
    if (c.chance !== undefined && c.success && c.fail) {
      const p = luckyChance(c.chance, luck(s));
      sc += p * scoreEffects(s, c.success.effects, strategy) + (1 - p) * scoreEffects(s, c.fail.effects, strategy);
      if (strategy === "safe") sc -= 4 * (1 - p);
      if (strategy === "risky") sc += 2;
    }
    if (sc > bestScore) {
      bestScore = sc;
      best = i;
    }
  });
  return Math.max(0, best);
}

function autoAction(
  s: GameState,
  strategy: Strategy,
  rng: Rng,
  bigSteps: boolean,
): { actionId: string; spotId?: string } | null {
  const views = actionViews(s).filter((v) => !v.lock);
  const has = (id: string) => views.some((v) => v.def.id === id);
  const st = s.stats;
  const m = cityOf(s).meal;
  const spots = spotViews(s)
    .filter((sv) => !sv.lock)
    .map((sv) => sv.spot);
  const bestSpot = (score: (sp: Spot) => number) =>
    spots.slice().sort((a, b) => score(b) - score(a))[0]?.id;
  const begSpot = () =>
    strategy === "safe"
      ? bestSpot((sp) => sp.income * (1 - sp.risk) * (1 - sp.police) - st.heat / 200)
      : strategy === "balanced"
        ? bestSpot((sp) => sp.income * (1 - sp.risk * 0.5) * (1 - sp.police * (st.heat > 50 ? 0.8 : 0.3)))
        : bestSpot((sp) => sp.income * (1 - (st.heat > 70 ? sp.police : 0)));

  if (s.phase === "night") {
    if (st.hunger < 30 && has("buy_food") && st.energy > 30) return { actionId: "buy_food" };
    if (st.thirst < 25 && has("buy_water") && st.energy > 30) return { actionId: "buy_water" };
    if (has("sleep")) return { actionId: "sleep" };
  }
  if ((hasFlag(s, "sick") || hasFlag(s, "injured")) && st.health < 60) {
    if (has("clinic") && (strategy !== "risky" || st.health < 35)) return { actionId: "clinic" };
    if (has("ngo")) return { actionId: "ngo" };
  }
  if (st.health < 30 && has("ngo")) return { actionId: "ngo" };
  if (st.hunger < 40) {
    if (has("charity")) return { actionId: "charity" };
    if (has("buy_food")) return { actionId: "buy_food" };
  }
  if (st.thirst < 35) {
    if (has("buy_water")) return { actionId: "buy_water" };
    if (has("charity")) return { actionId: "charity" };
  }
  if (st.energy < 25 && has("rest")) return { actionId: "rest" };
  if (st.hygiene < 25 && has("wash")) return { actionId: "wash" };
  // Life-changing choices are left to the player unless explicitly allowed (headless tools).
  if (bigSteps && has("rent_room")) return { actionId: "rent_room" };
  if (bigSteps && has("open_stall")) return { actionId: "open_stall" };
  if (s.stash > 0 && st.hunger < 35 && s.cash < m && has("withdraw")) return { actionId: "withdraw" };
  if (!hasFlag(s, "has_id") && has("apply_id") && rng.chance(0.2)) return { actionId: "apply_id" };
  if (has("ngo") && rng.chance(strategy === "safe" ? 0.14 : 0.08)) return { actionId: "ngo" };
  if (has("call_family") && rng.chance(0.05)) return { actionId: "call_family" };
  if (has("talk") && rng.chance(0.08)) return { actionId: "talk" };
  if (has("teach") && rng.chance(0.15)) return { actionId: "teach" };
  if (has("dog") && rng.chance(s.companion ? 0.04 : 0.07)) return { actionId: "dog" };
  if (s.phase === "afternoon" && s.cash > 8 * m && strategy !== "risky" && has("save") && rng.chance(0.4))
    return { actionId: "save" };
  if (strategy === "risky" && has("gamble") && rng.chance(0.08)) return { actionId: "gamble" };
  if (has("work")) return { actionId: "work" };
  if (has("busk") && rng.chance(0.55))
    return { actionId: "busk", spotId: bestSpot((sp) => sp.tourists * sp.income * (1 - sp.police * 0.5)) };
  if (has("sell") && rng.chance(0.6)) return { actionId: "sell", spotId: begSpot() };
  if (has("buy_stock") && strategy !== "safe" && !s.items.goods && s.cash > 5 * m && rng.chance(0.15))
    return { actionId: "buy_stock" };
  if (has("labor") && strategy !== "safe" && st.health > 60 && rng.chance(0.3)) return { actionId: "labor" };
  if (has("recycle") && strategy === "safe" && rng.chance(0.3)) return { actionId: "recycle" };
  if (has("beg")) return { actionId: "beg", spotId: begSpot() };
  if (has("recycle")) return { actionId: "recycle" };
  if (has("rest")) return { actionId: "rest" };
  if (has("sleep")) return { actionId: "sleep" };
  return views[0] ? { actionId: views[0].def.id } : null;
}

function autoSim(s: GameState, rng: Rng, days: number, strategy: Strategy, bigSteps = false) {
  const target = s.day + days;
  const startDay = s.day;
  const city0 = cityOf(s);
  const cashBefore = (s.cash + s.stash) / city0.meal;
  const statsBefore = { ...s.stats };
  const events: { icon: string; th: string; en: string }[] = [];
  const milestones: string[] = [];
  let stoppedEarly = false;
  let guard = 0;

  outer: while (!s.ended && s.day < target && guard++ < days * 4 + 30) {
    while (s.pendingEvent || s.eventResult) {
      if (s.eventResult) {
        s.eventResult = null;
        finalize(s);
        continue;
      }
      const ev = DATA.event[s.pendingEvent!];
      if (ev?.major) {
        stoppedEarly = true;
        break outer;
      }
      const idx = autoChoice(s, strategy);
      if (!chooseEvent(s, rng, idx)) {
        s.pendingEvent = null;
        continue;
      }
      if (ev) events.push({ icon: ev.icon, th: ev.title_th, en: ev.title_en });
      if (s.ended) break outer;
    }
    if (s.ended || s.day >= target) break;
    const pick = autoAction(s, strategy, rng, bigSteps);
    s.newMilestones = [];
    if (!pick || !performAction(s, rng, pick.actionId, pick.spotId)) {
      endPhase(s, rng, null, null);
    }
    finalize(s);
    milestones.push(...s.newMilestones);
  }
  if (s.eventResult) {
    s.eventResult = null;
    finalize(s);
  }
  const city1 = cityOf(s);
  const statDelta: Partial<Record<StatKey, number>> = {};
  for (const k of STAT_KEYS) statDelta[k] = Math.round(s.stats[k] - statsBefore[k]);
  s.summary = {
    days: s.day - startDay,
    strategy,
    cashBefore: cashBefore * city1.meal,
    cashAfter: s.cash + s.stash,
    stats: statDelta,
    events: events.slice(-12),
    milestones,
    stoppedEarly,
  };
  s.newMilestones = milestones;
}

/**
 * Pure auto-simulation without the day-30/180 unlock gate (used by tests/tools).
 * Unlike the in-game skip, it also takes life-changing actions (rent a room, open a stall).
 */
export function simulateDays(state: GameState, days: number, strategy: Strategy): GameState {
  if (state.ended || state.pendingEvent || state.eventResult) return state;
  const s = clone(state);
  const rng = new Rng(s.rngState);
  autoSim(s, rng, days, strategy, true);
  s.rngState = rng.state;
  return s;
}

// ------------------------------------------------------------------ public reducer

export function step(state: GameState, action: GameAction): GameState {
  if (state.ended && action.type !== "dismiss") return state;
  const s = clone(state);
  const rng = new Rng(s.rngState);
  s.newMilestones = [];

  switch (action.type) {
    case "revealDone":
      s.revealed = true;
      break;
    case "act":
      if (s.pendingEvent || s.eventResult) return state;
      if (!performAction(s, rng, action.actionId, action.spotId)) return state;
      finalize(s);
      break;
    case "choose":
      if (!chooseEvent(s, rng, action.choiceIndex)) return state;
      finalize(s);
      break;
    case "dismiss":
      s.eventResult = null;
      finalize(s);
      break;
    case "skip": {
      if (s.pendingEvent || s.eventResult) return state;
      const unlocked = action.days <= 7 ? s.day > 30 : s.day > 180;
      if (!unlocked) return state;
      autoSim(s, rng, action.days, action.strategy);
      break;
    }
    case "clearSummary":
      s.summary = null;
      break;
  }
  s.rngState = rng.state;
  return s;
}

// ------------------------------------------------------------------ read-only helpers for UI

export function phaseIndex(p: Phase) {
  return p === "morning" ? 0 : p === "afternoon" ? 1 : 2;
}

export function lifeStats(s: GameState) {
  const city = cityOf(s);
  return {
    days: s.ended?.day ?? s.day,
    earned: (s.counters.earnedMeals ?? 0) * city.meal,
    mealsGiven: s.counters.mealsGiven ?? 0,
    friends: s.counters.friends ?? 0,
    cities: s.citiesLived.length,
    helped: s.counters.helped ?? 0,
    nightsShelter: s.counters.nightsShelter ?? 0,
  };
}

export function worldInfo(s: GameState) {
  return {
    city: cityOf(s),
    festivals: activeFestivals(s),
    month: currentMonth(s),
    wealthMeals: wealthMeals(s),
  };
}
