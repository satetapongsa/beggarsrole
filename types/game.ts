// Core type definitions for SPARE CHANGE.
// Data files in /data are validated against these shapes at load time (lib/data.ts).

export type Lang = "th" | "en";
export type Phase = "morning" | "afternoon" | "night";
export const PHASES: Phase[] = ["morning", "afternoon", "night"];

export type StatKey =
  | "health"
  | "hunger"
  | "thirst"
  | "hygiene"
  | "hope"
  | "energy"
  | "rep"
  | "heat";
export const STAT_KEYS: StatKey[] = [
  "health",
  "hunger",
  "thirst",
  "hygiene",
  "hope",
  "energy",
  "rep",
  "heat",
];

export type AgeGroup = "child" | "young" | "adult" | "elder";
export type Weather = "clear" | "cloudy" | "rain" | "storm" | "heat" | "cold" | "snow";
export type Climate = "hot" | "monsoon" | "cold_winter" | "mild";
export type Level = "low" | "medium" | "high";
export type Difficulty = "easy" | "normal" | "hard" | "brutal";
export type Strategy = "safe" | "balanced" | "risky";
export type Cause = "cold" | "heat" | "illness" | "hunger" | "storm" | "age" | "injury";
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type SceneKind =
  | "temple"
  | "station"
  | "market"
  | "skyscraper"
  | "bridge"
  | "plaza"
  | "mosque"
  | "church"
  | "street"
  | "park"
  | "beach"
  | "harbor";

/** A fixed number or an inclusive [min, max] range rolled with the seeded RNG. */
export type Range = number | [number, number];

/** Numeric thresholds. "cash", "stash" and "wealth" (cash + stash) are measured in meal units. */
export type ThresholdKey = StatKey | "cash" | "stash" | "wealth";

// ---------------------------------------------------------------- cities

export interface Spot {
  id: string;
  name_th: string;
  name_en: string;
  scene: SceneKind;
  /** Income multiplier for begging/busking/selling here. */
  income: number;
  /** 0–1. Raises the chance and weight of danger events. */
  risk: number;
  /** 0–1. Heat gained per session. */
  police: number;
  /** 0–1. Share of passers-by who are tourists (busking/selling bonus). */
  tourists: number;
  minRep?: number;
}

export interface Festival {
  id: string;
  name_th: string;
  name_en: string;
  /** [month 1–12, day 1–31] — approximate, fixed each year for gameplay. */
  start: [number, number];
  days: number;
  bonus: number;
}

export interface CityName {
  th: string;
  en: string;
  g: "f" | "m" | "x";
}

export interface City {
  id: string;
  name_th: string;
  name_en: string;
  flag: string;
  country_th: string;
  country_en: string;
  /** Relative roll weight (approximate street population). */
  weight: number;
  currency: { symbol: string; code: string; decimals: number };
  /** Price of a cheap meal in local currency — the game's universal "meal unit". */
  meal: number;
  /** Typical full day of begging income, local currency. */
  dailyIncome: [number, number];
  milestoneCash: number;
  climate: Climate;
  hotMonths: number[];
  wetMonths: number[];
  coldMonths: number[];
  snow: boolean;
  shelter: Level;
  difficulty: Difficulty;
  charity_th: string;
  charity_en: string;
  blurb_th: string;
  blurb_en: string;
  spots: Spot[];
  festivals: Festival[];
  names: CityName[];
}

// ---------------------------------------------------------------- conditions & effects

export interface Conditions {
  minDay?: number;
  maxDay?: number;
  minAge?: number;
  maxAge?: number;
  ageGroups?: AgeGroup[];
  cities?: string[];
  notCities?: string[];
  climates?: Climate[];
  spots?: string[];
  scenes?: SceneKind[];
  weather?: Weather[];
  phases?: Phase[];
  months?: number[];
  festival?: boolean;
  festivals?: string[];
  traits?: string[];
  anyTraits?: string[];
  notTraits?: string[];
  flags?: string[];
  anyFlags?: string[];
  notFlags?: string[];
  items?: string[];
  notItems?: string[];
  origins?: string[];
  min?: Partial<Record<ThresholdKey, number>>;
  max?: Partial<Record<ThresholdKey, number>>;
  counters?: Record<string, number>;
  maxCounters?: Record<string, number>;
  companion?: boolean;
  hasFamily?: boolean;
  sheltered?: boolean;
  shelter?: Level[];
  inSeason?: ("hot" | "wet" | "cold")[];
  afterActions?: string[];
  chance?: number;
}

export interface Effects {
  health?: Range;
  hunger?: Range;
  thirst?: Range;
  hygiene?: Range;
  hope?: Range;
  energy?: Range;
  rep?: Range;
  heat?: Range;
  /** Meal units (converted to local currency). */
  cash?: Range;
  /** Fraction of current cash (e.g. -0.5 = lose half). */
  cashPct?: number;
  stashPct?: number;
  items?: Record<string, number>;
  flags?: string[];
  unflags?: string[];
  counters?: Record<string, number>;
  addTraits?: string[];
  /** true = gain a dog companion, false = lose it. */
  companion?: boolean;
  sheltered?: boolean;
  /** What to blame if this effect's damage is fatal. */
  cause?: Cause;
}

// ---------------------------------------------------------------- content

export interface Trait {
  id: string;
  name_th: string;
  name_en: string;
  desc_th: string;
  desc_en: string;
  icon: string;
  positive: boolean;
  weight: number;
  hidden?: boolean;
  mods?: {
    beg?: number;
    busk?: number;
    labor?: number;
    energy?: number;
    healthLoss?: number;
    hopeLoss?: number;
    heat?: number;
    luck?: number;
    night?: number;
    cold?: number;
  };
}

export interface Item {
  id: string;
  name_th: string;
  name_en: string;
  icon: string;
  desc_th: string;
  desc_en: string;
}

export interface Origin {
  id: string;
  name_th: string;
  name_en: string;
  story_th: string;
  story_en: string;
  weight: number;
  ageGroups: AgeGroup[];
  minAge?: number;
  maxAge?: number;
  cities?: string[];
  hasFamily: boolean;
  stats?: Partial<Record<StatKey, number>>;
  cash: number;
  items?: Record<string, number>;
  flags?: string[];
  grantTrait?: string;
}

export type ActionKind =
  | "beg"
  | "busk"
  | "sell"
  | "buy_stock"
  | "recycle"
  | "labor"
  | "work"
  | "gamble"
  | "charity"
  | "buy_food"
  | "buy_water"
  | "wash"
  | "rest"
  | "sleep"
  | "clinic"
  | "ngo"
  | "talk"
  | "dog"
  | "teach"
  | "call_family"
  | "save"
  | "withdraw"
  | "apply_id"
  | "move_city"
  | "rent_room"
  | "open_stall";

export type ActionCategory = "earn" | "survive" | "people" | "future";

export interface ActionDef {
  id: string;
  kind: ActionKind;
  category: ActionCategory;
  icon: string;
  name_th: string;
  name_en: string;
  desc_th: string;
  desc_en: string;
  phases: Phase[];
  energy: number;
  /** Card is hidden entirely unless these are met. */
  visible?: Conditions;
  /** Card is shown but locked (with a reason) unless these are met. */
  requires?: Conditions;
  /** Meal-unit cost paid up front (locked if you cannot afford it). */
  cost?: number;
  pickSpot?: boolean;
  effects?: Effects;
  /** Base chance of an action-triggered event afterwards. */
  eventChance: number;
  flavor_th: string[];
  flavor_en: string[];
}

export interface Outcome {
  text_th: string;
  text_en: string;
  effects?: Effects;
}

export interface EventChoice {
  label_th: string;
  label_en: string;
  requires?: Conditions;
  effects?: Effects;
  text_th?: string;
  text_en?: string;
  chance?: number;
  success?: Outcome;
  fail?: Outcome;
}

export type EventTrigger = "day" | "action" | "any" | "birthday";

export interface GameEvent {
  id: string;
  title_th: string;
  title_en: string;
  text_th: string;
  text_en: string;
  icon: string;
  weight: number;
  trigger: EventTrigger;
  tags: string[];
  conditions?: Conditions;
  once?: boolean;
  /** Fires automatically (no random roll) the first time its conditions are met. */
  forced?: boolean;
  cooldown?: number;
  /** Add the chosen outcome to the life timeline. */
  major?: boolean;
  choices: EventChoice[];
}

export interface Ending {
  id: string;
  title_th: string;
  title_en: string;
  rarity: Rarity;
  icon: string;
  priority: number;
  /** Death endings: matched against the cause of death. */
  death?: Cause[];
  hidden?: boolean;
  conditions?: Conditions;
  epitaph_th: string;
  epitaph_en: string;
  line_th: string;
  line_en: string;
}

// ---------------------------------------------------------------- state

export interface Appearance {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  hairStyle: number;
}

export interface Character {
  name_th: string;
  name_en: string;
  gender: "f" | "m" | "x";
  ageStart: number;
  ageGroup: AgeGroup;
  origin: string;
  traits: string[];
  hiddenTraits: string[];
  appearance: Appearance;
  /** "1 in X players got this life". */
  oneIn: number;
}

export interface Companion {
  kind: "dog";
  name_th: string;
  name_en: string;
  since: number;
}

export interface Deltas {
  stats: Partial<Record<StatKey, number>>;
  cash: number;
  stash: number;
  items: Record<string, number>;
}

export interface LogEntry {
  day: number;
  phase: Phase;
  th: string;
  en: string;
  tone: "good" | "bad" | "neutral";
  deltas?: Deltas;
}

export interface TimelineEntry {
  day: number;
  age: number;
  icon: string;
  th: string;
  en: string;
  kind: "start" | "milestone" | "event" | "life" | "ending";
}

export interface EventResult {
  eventId: string;
  title_th: string;
  title_en: string;
  icon: string;
  text_th: string;
  text_en: string;
  success?: boolean;
  deltas: Deltas;
}

export interface SimSummary {
  days: number;
  strategy: Strategy;
  cashBefore: number;
  cashAfter: number;
  stats: Partial<Record<StatKey, number>>;
  events: { icon: string; th: string; en: string }[];
  milestones: string[];
  stoppedEarly: boolean;
}

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  revealed: boolean;
  character: Character;
  cityId: string;
  citiesLived: string[];
  day: number;
  phase: Phase;
  startDoy: number;
  age: number;
  stats: Record<StatKey, number>;
  cash: number;
  stash: number;
  items: Record<string, number>;
  flags: string[];
  counters: Record<string, number>;
  companion: Companion | null;
  weather: Weather;
  sheltered: boolean;
  lastSpot: string | null;
  lastHarm: Cause;
  eventQueue: string[];
  pendingEvent: string | null;
  eventResult: EventResult | null;
  eventHistory: Record<string, number>;
  log: LogEntry[];
  timeline: TimelineEntry[];
  milestones: string[];
  newMilestones: string[];
  summary: SimSummary | null;
  ended: { endingId: string; day: number; age: number } | null;
  /** Every action that changed the state since newGame(seed) — lets the server replay and verify a life. */
  actions?: GameAction[];
  /** Set when this life is a daily challenge (YYYY-MM-DD, Bangkok time). */
  daily?: string;
}

export type GameAction =
  | { type: "act"; actionId: string; spotId?: string }
  | { type: "choose"; choiceIndex: number }
  | { type: "dismiss" }
  | { type: "skip"; days: number; strategy: Strategy }
  | { type: "clearSummary" }
  | { type: "revealDone" };

export interface LockReason {
  key: string;
  vars?: Record<string, string | number>;
}
