// Loads and validates all JSON game data. Malformed entries are skipped with console.warn
// so one bad event never crashes the game.

import citiesRaw from "@/data/cities.json";
import originsRaw from "@/data/origins.json";
import actionsRaw from "@/data/actions.json";
import eventsRaw from "@/data/events.json";
import endingsRaw from "@/data/endings.json";
import traitsRaw from "@/data/traits.json";
import itemsRaw from "@/data/items.json";
import type {
  ActionDef,
  City,
  Ending,
  GameEvent,
  Item,
  Origin,
  Trait,
} from "@/types/game";

type Guard<T> = (x: unknown) => string | null; // returns error message or null

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);
const isStr = (x: unknown) => typeof x === "string" && x.length > 0;
const isNum = (x: unknown) => typeof x === "number" && Number.isFinite(x);
const isArr = Array.isArray;

function need(o: Record<string, unknown>, keys: string[], test: (x: unknown) => boolean, what: string) {
  for (const k of keys) if (!test(o[k])) return `${what} "${k}" missing or invalid`;
  return null;
}

const cityGuard: Guard<City> = (x) => {
  if (!isObj(x)) return "not an object";
  return (
    need(x, ["id", "name_th", "name_en", "flag", "charity_th", "charity_en"], isStr, "string") ??
    need(x, ["weight", "meal", "milestoneCash"], isNum, "number") ??
    (!isArr(x.spots) || x.spots.length < 1 ? "spots missing" : null) ??
    (!isArr(x.names) || x.names.length < 1 ? "names missing" : null) ??
    (!isArr(x.dailyIncome) || x.dailyIncome.length !== 2 ? "dailyIncome invalid" : null) ??
    (!isObj(x.currency) ? "currency missing" : null)
  );
};

const originGuard: Guard<Origin> = (x) => {
  if (!isObj(x)) return "not an object";
  return (
    need(x, ["id", "name_th", "name_en", "story_th", "story_en"], isStr, "string") ??
    need(x, ["weight", "cash"], isNum, "number") ??
    (!isArr(x.ageGroups) || x.ageGroups.length === 0 ? "ageGroups missing" : null)
  );
};

const actionGuard: Guard<ActionDef> = (x) => {
  if (!isObj(x)) return "not an object";
  return (
    need(x, ["id", "kind", "category", "icon", "name_th", "name_en", "desc_th", "desc_en"], isStr, "string") ??
    need(x, ["energy", "eventChance"], isNum, "number") ??
    (!isArr(x.phases) || x.phases.length === 0 ? "phases missing" : null) ??
    (!isArr(x.flavor_th) || !isArr(x.flavor_en) ? "flavor text missing" : null)
  );
};

const choiceGuard = (c: unknown): string | null => {
  if (!isObj(c)) return "choice not an object";
  if (!isStr(c.label_th) || !isStr(c.label_en)) return "choice label missing";
  if (c.chance !== undefined) {
    if (!isNum(c.chance)) return "choice chance invalid";
    if (!isObj(c.success) || !isObj(c.fail)) return "chance choice needs success + fail";
    for (const o of [c.success, c.fail] as Record<string, unknown>[])
      if (!isStr(o.text_th) || !isStr(o.text_en)) return "outcome text missing";
  } else if (!isStr(c.text_th) || !isStr(c.text_en)) return "choice result text missing";
  return null;
};

const eventGuard: Guard<GameEvent> = (x) => {
  if (!isObj(x)) return "not an object";
  const base =
    need(x, ["id", "title_th", "title_en", "text_th", "text_en", "icon", "trigger"], isStr, "string") ??
    need(x, ["weight"], isNum, "number") ??
    (!isArr(x.choices) || x.choices.length === 0 ? "choices missing" : null) ??
    (!["day", "action", "any", "birthday"].includes(x.trigger as string) ? "bad trigger" : null);
  if (base) return base;
  for (const c of x.choices as unknown[]) {
    const err = choiceGuard(c);
    if (err) return err;
  }
  return null;
};

const endingGuard: Guard<Ending> = (x) => {
  if (!isObj(x)) return "not an object";
  return (
    need(x, ["id", "title_th", "title_en", "rarity", "icon", "epitaph_th", "epitaph_en", "line_th", "line_en"], isStr, "string") ??
    need(x, ["priority"], isNum, "number")
  );
};

const traitGuard: Guard<Trait> = (x) => {
  if (!isObj(x)) return "not an object";
  return (
    need(x, ["id", "name_th", "name_en", "desc_th", "desc_en", "icon"], isStr, "string") ??
    need(x, ["weight"], isNum, "number")
  );
};

const itemGuard: Guard<Item> = (x) => {
  if (!isObj(x)) return "not an object";
  return need(x, ["id", "name_th", "name_en", "icon", "desc_th", "desc_en"], isStr, "string");
};

export const dataWarnings: string[] = [];

function load<T extends { id: string }>(raw: unknown, guard: Guard<T>, file: string): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  if (!isArr(raw)) {
    const msg = `[data] ${file} is not an array`;
    console.warn(msg);
    dataWarnings.push(msg);
    return out;
  }
  raw.forEach((entry, i) => {
    const err = guard(entry);
    const id = isObj(entry) && typeof entry.id === "string" ? entry.id : `#${i}`;
    if (err) {
      const msg = `[data] skipped ${file} entry ${id}: ${err}`;
      console.warn(msg);
      dataWarnings.push(msg);
      return;
    }
    if (seen.has(id)) {
      const msg = `[data] skipped duplicate ${file} id ${id}`;
      console.warn(msg);
      dataWarnings.push(msg);
      return;
    }
    seen.add(id);
    out.push(entry as T);
  });
  return out;
}

const byId = <T extends { id: string }>(arr: T[]) =>
  Object.fromEntries(arr.map((x) => [x.id, x])) as Record<string, T>;

const cities = load<City>(citiesRaw, cityGuard, "cities.json");
const origins = load<Origin>(originsRaw, originGuard, "origins.json");
const actions = load<ActionDef>(actionsRaw, actionGuard, "actions.json");
const events = load<GameEvent>(eventsRaw, eventGuard, "events.json");
const endings = load<Ending>(endingsRaw, endingGuard, "endings.json").sort(
  (a, b) => b.priority - a.priority,
);
const traits = load<Trait>(traitsRaw, traitGuard, "traits.json");
const items = load<Item>(itemsRaw, itemGuard, "items.json");

export const DATA = {
  cities,
  origins,
  actions,
  events,
  endings,
  traits,
  items,
  city: byId(cities),
  origin: byId(origins),
  action: byId(actions),
  event: byId(events),
  ending: byId(endings),
  trait: byId(traits),
  item: byId(items),
};

export const DOG_NAMES: { th: string; en: string }[] = [
  { th: "ลัคกี้", en: "Lucky" },
  { th: "บิสกิต", en: "Biscuit" },
  { th: "มะม่วง", en: "Mango" },
  { th: "กัปตัน", en: "Captain" },
  { th: "พริก", en: "Pepper" },
  { th: "ถุงเท้า", en: "Socks" },
  { th: "เส้นหมี่", en: "Noodle" },
  { th: "ถั่ว", en: "Bean" },
];
