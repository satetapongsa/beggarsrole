// Achievements: goals checked when a life ends, against that life and the player's career
// (totals across every life on this device). Pure — storage lives in lib/storage.ts.
// Some achievements unlock rewards (extra survivor-poster themes).

import { DATA } from "@/lib/data";
import { ageGroupOf } from "@/lib/conditions";
import { lifeStats } from "@/lib/engine";
import { scoreLife } from "@/lib/score";
import type { GameState } from "@/types/game";

export type Tier = "bronze" | "silver" | "gold";

export const TIER_STYLE: Record<Tier, string> = {
  bronze: "border-amber-800 text-amber-300",
  silver: "border-slate-400 text-slate-200",
  gold: "border-yellow-400 text-yellow-200",
};

export interface Career {
  lives: number;
  escapes: number;
  deaths: number;
  days: number;
  bestDays: number;
  bestScore: number;
  dailies: number;
  friends: number;
  mealsGiven: number;
  /** Every city lived in, across all lives. */
  cities: string[];
  /** Lives counted so far (see lifeKey), newest first — prevents double counting. */
  recent: string[];
}

export const EMPTY_CAREER: Career = {
  lives: 0,
  escapes: 0,
  deaths: 0,
  days: 0,
  bestDays: 0,
  bestScore: 0,
  dailies: 0,
  friends: 0,
  mealsGiven: 0,
  cities: [],
  recent: [],
};

export interface Ctx {
  life: GameState;
  career: Career;
  endings: Set<string>;
}

export interface Achievement {
  id: string;
  icon: string;
  tier: Tier;
  name_th: string;
  name_en: string;
  desc_th: string;
  desc_en: string;
  /** Hidden until earned. */
  secret?: boolean;
  test: (c: Ctx) => boolean;
  /** Optional progress toward the goal, for the achievements page. */
  progress?: (c: Omit<Ctx, "life">) => [number, number];
}

const ending = (s: GameState) => (s.ended ? DATA.ending[s.ended.endingId] : undefined);
const escaped = (s: GameState) => {
  const e = ending(s);
  return !!e && !e.death;
};
const days = (s: GameState) => lifeStats(s).days;
const startCity = (s: GameState) => DATA.city[s.citiesLived[0]] ?? DATA.city[s.cityId];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_life", icon: "🕯️", tier: "bronze",
    name_th: "ชีวิตแรก", name_en: "First Life",
    desc_th: "จบชีวิตแรกบนท้องถนน", desc_en: "Finish your first life on the street",
    test: ({ career }) => career.lives >= 1,
  },
  {
    id: "first_week", icon: "📅", tier: "bronze",
    name_th: "รอดสัปดาห์แรก", name_en: "One Week",
    desc_th: "อยู่รอดครบ 7 วันในชีวิตเดียว", desc_en: "Survive 7 days in one life",
    test: ({ life }) => days(life) >= 7,
  },
  {
    id: "first_month", icon: "🗓️", tier: "bronze",
    name_th: "หนึ่งเดือน", name_en: "One Month",
    desc_th: "อยู่รอดครบ 30 วันในชีวิตเดียว", desc_en: "Survive 30 days in one life",
    test: ({ life }) => days(life) >= 30,
  },
  {
    id: "one_year", icon: "🎂", tier: "silver",
    name_th: "หนึ่งปีเต็ม", name_en: "A Full Year",
    desc_th: "อยู่รอดครบ 365 วันในชีวิตเดียว", desc_en: "Survive 365 days in one life",
    test: ({ life }) => days(life) >= 365,
  },
  {
    id: "decade", icon: "🏛️", tier: "gold",
    name_th: "สิบปีบนถนน", name_en: "Ten Years Out There",
    desc_th: "อยู่รอดครบ 10 ปีในชีวิตเดียว", desc_en: "Survive ten years in one life",
    test: ({ life }) => days(life) >= 3650,
  },
  {
    id: "first_escape", icon: "🌅", tier: "bronze",
    name_th: "ทางออก", name_en: "A Way Out",
    desc_th: "หลุดพ้นจากชีวิตข้างถนนได้เป็นครั้งแรก", desc_en: "Get off the street for the first time",
    test: ({ life }) => escaped(life),
  },
  {
    id: "quick_escape", icon: "⚡", tier: "silver",
    name_th: "ไม่รอช้า", name_en: "No Time Wasted",
    desc_th: "หลุดพ้นภายใน 90 วัน", desc_en: "Get off the street within 90 days",
    test: ({ life }) => escaped(life) && days(life) <= 90,
  },
  {
    id: "brutal_escape", icon: "🔥", tier: "gold",
    name_th: "ฝ่าเมืองโหด", name_en: "Against All Odds",
    desc_th: "หลุดพ้นได้ทั้งที่เริ่มในเมืองระดับโหดสุด", desc_en: "Escape after starting in a brutal city",
    test: ({ life }) => escaped(life) && startCity(life)?.difficulty === "brutal",
  },
  {
    id: "child_escape", icon: "🎒", tier: "silver",
    name_th: "เด็กที่ไปต่อได้", name_en: "The Kid Made It",
    desc_th: "หลุดพ้นได้ในชีวิตที่เริ่มตอนเป็นเด็ก", desc_en: "Escape in a life that started as a child",
    test: ({ life }) => escaped(life) && life.character.ageGroup === "child",
  },
  {
    id: "elder_escape", icon: "🧓", tier: "silver",
    name_th: "ยังไม่สายเกินไป", name_en: "Never Too Late",
    desc_th: "หลุดพ้นได้ในชีวิตที่เริ่มตอนเป็นผู้สูงอายุ", desc_en: "Escape in a life that started as an elder",
    test: ({ life }) => escaped(life) && ageGroupOf(life.character.ageStart) === "elder",
  },
  {
    id: "legendary", icon: "👑", tier: "gold",
    name_th: "ตำนาน", name_en: "Legendary",
    desc_th: "ได้ฉากจบระดับตำนาน", desc_en: "Reach a legendary ending",
    test: ({ life }) => ending(life)?.rarity === "legendary",
  },
  {
    id: "secret_found", icon: "✨", tier: "silver",
    name_th: "ความลับของถนน", name_en: "Street Secret",
    desc_th: "พบฉากจบลับ", desc_en: "Find a hidden ending",
    test: ({ life }) => !!ending(life)?.hidden,
  },
  {
    id: "generous", icon: "🍚", tier: "silver",
    name_th: "มือที่ให้", name_en: "Open Hands",
    desc_th: "แบ่งอาหารให้คนอื่น 20 มื้อในชีวิตเดียว", desc_en: "Share 20 meals in one life",
    test: ({ life }) => lifeStats(life).mealsGiven >= 20,
  },
  {
    id: "social", icon: "🤝", tier: "silver",
    name_th: "ไม่เคยตัวคนเดียว", name_en: "Never Alone",
    desc_th: "มีเพื่อน 10 คนในชีวิตเดียว", desc_en: "Make 10 friends in one life",
    test: ({ life }) => lifeStats(life).friends >= 10,
  },
  {
    id: "dog_end", icon: "🐕", tier: "bronze",
    name_th: "เพื่อนสี่ขา", name_en: "Four-Legged Friend",
    desc_th: "จบชีวิตโดยมีหมาอยู่ข้างๆ", desc_en: "End a life with your dog still by your side",
    test: ({ life }) => !!life.companion,
  },
  {
    id: "drifter", icon: "🧳", tier: "silver",
    name_th: "คนพเนจร", name_en: "Drifter",
    desc_th: "ใช้ชีวิตใน 3 เมืองในชีวิตเดียว", desc_en: "Live in 3 cities in one life",
    test: ({ life }) => life.citiesLived.length >= 3,
  },
  {
    id: "sheltered", icon: "🛏️", tier: "bronze",
    name_th: "หลังคาเหนือหัว", name_en: "A Roof, Sometimes",
    desc_th: "นอนในศูนย์พักพิง 30 คืนในชีวิตเดียว", desc_en: "Spend 30 nights in a shelter in one life",
    test: ({ life }) => lifeStats(life).nightsShelter >= 30,
  },
  {
    id: "lucky", icon: "🎲", tier: "bronze", secret: true,
    name_th: "ดวงมา", name_en: "Feeling Lucky",
    desc_th: "ชนะพนัน 5 ครั้งในชีวิตเดียว", desc_en: "Win 5 bets in one life",
    test: ({ life }) => (life.counters.gambleWins ?? 0) >= 5,
  },
  {
    id: "high_score", icon: "🏆", tier: "gold",
    name_th: "หมื่นห้า", name_en: "Fifteen Thousand",
    desc_th: "ทำคะแนนได้ 15,000 ขึ้นไปในชีวิตเดียว", desc_en: "Score 15,000 or more in one life",
    test: ({ life }) => (scoreLife(life)?.total ?? 0) >= 15000,
    progress: ({ career }) => [Math.min(career.bestScore, 15000), 15000],
  },
  {
    id: "daily_player", icon: "📆", tier: "bronze",
    name_th: "ภารกิจประจำวัน", name_en: "Daily Ritual",
    desc_th: "จบชาเลนจ์ประจำวัน", desc_en: "Finish a daily challenge",
    test: ({ career }) => career.dailies >= 1,
  },
  {
    id: "daily_regular", icon: "🗞️", tier: "silver",
    name_th: "ขาประจำ", name_en: "Regular",
    desc_th: "จบชาเลนจ์ประจำวัน 7 ครั้ง", desc_en: "Finish 7 daily challenges",
    test: ({ career }) => career.dailies >= 7,
    progress: ({ career }) => [Math.min(career.dailies, 7), 7],
  },
  {
    id: "lives_10", icon: "🔁", tier: "bronze",
    name_th: "สิบชีวิต", name_en: "Ten Lives",
    desc_th: "เล่นจบ 10 ชีวิต", desc_en: "Finish 10 lives",
    test: ({ career }) => career.lives >= 10,
    progress: ({ career }) => [Math.min(career.lives, 10), 10],
  },
  {
    id: "lives_50", icon: "♾️", tier: "silver",
    name_th: "ห้าสิบชีวิต", name_en: "Fifty Lives",
    desc_th: "เล่นจบ 50 ชีวิต", desc_en: "Finish 50 lives",
    test: ({ career }) => career.lives >= 50,
    progress: ({ career }) => [Math.min(career.lives, 50), 50],
  },
  {
    id: "world_5", icon: "🗺️", tier: "bronze",
    name_th: "ห้าเมือง", name_en: "Five Cities",
    desc_th: "ใช้ชีวิตใน 5 เมืองต่างกัน (รวมทุกชีวิต)", desc_en: "Live in 5 different cities across all lives",
    test: ({ career }) => career.cities.length >= 5,
    progress: ({ career }) => [Math.min(career.cities.length, 5), 5],
  },
  {
    id: "world_all", icon: "🌍", tier: "gold",
    name_th: "ทุกมุมโลก", name_en: "Every Corner",
    desc_th: "ใช้ชีวิตครบทุกเมืองในเกม (รวมทุกชีวิต)", desc_en: "Live in every city in the game across all lives",
    test: ({ career }) => DATA.cities.every((c) => career.cities.includes(c.id)),
    progress: ({ career }) => [career.cities.filter((id) => DATA.city[id]).length, DATA.cities.length],
  },
  {
    id: "endings_10", icon: "📖", tier: "silver",
    name_th: "นักสะสมเรื่องราว", name_en: "Story Collector",
    desc_th: "พบฉากจบ 10 แบบ", desc_en: "Discover 10 endings",
    test: ({ endings }) => endings.size >= 10,
    progress: ({ endings }) => [Math.min(endings.size, 10), 10],
  },
  {
    id: "endings_all", icon: "📚", tier: "gold",
    name_th: "ครบทุกชีวิต", name_en: "Every Life Lived",
    desc_th: "พบฉากจบครบทุกแบบ", desc_en: "Discover every ending",
    test: ({ endings }) => DATA.endings.every((e) => endings.has(e.id)),
    progress: ({ endings }) => [DATA.endings.filter((e) => endings.has(e.id)).length, DATA.endings.length],
  },
];

export const ACHIEVEMENT: Record<string, Achievement> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Rewards: survivor-poster themes unlocked by earning enough achievements. */
export const POSTER_UNLOCKS: { theme: string; need: number }[] = [
  { theme: "neon", need: 5 },
  { theme: "paper", need: 12 },
];

/** Identifies a finished life so the same one is never counted twice (autosave runs often). */
export function lifeKey(s: GameState): string {
  const moves = (s.actions ?? []).filter((a) => a.type === "act" || a.type === "choose" || a.type === "skip").length;
  return `${s.seed}:${s.ended?.endingId ?? ""}:${s.ended?.day ?? s.day}:${moves}`;
}

/** Folds a finished life into the career totals. Returns the same object if already counted. */
export function addLife(career: Career, s: GameState): Career {
  const key = lifeKey(s);
  if (!s.ended || career.recent.includes(key)) return career;
  const st = lifeStats(s);
  const e = ending(s);
  return {
    lives: career.lives + 1,
    escapes: career.escapes + (e && !e.death ? 1 : 0),
    deaths: career.deaths + (e?.death ? 1 : 0),
    days: career.days + st.days,
    bestDays: Math.max(career.bestDays, st.days),
    bestScore: Math.max(career.bestScore, scoreLife(s)?.total ?? 0),
    dailies: career.dailies + (s.daily ? 1 : 0),
    friends: career.friends + st.friends,
    mealsGiven: career.mealsGiven + st.mealsGiven,
    cities: Array.from(new Set([...career.cities, ...s.citiesLived])),
    recent: [key, ...career.recent].slice(0, 50),
  };
}

/** Ids of achievements this context satisfies that are not yet in `have`. */
export function newlyEarned(c: Ctx, have: Set<string>): string[] {
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.test(c)).map((a) => a.id);
}
