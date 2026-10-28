// localStorage helpers. Every call is wrapped in try/catch: private mode, quota errors
// or disabled storage must never crash the game.

import { addLife, EMPTY_CAREER, lifeKey, newlyEarned, type Career } from "@/lib/achievements";
import { SAVE_VERSION } from "@/lib/engine";
import { scoreLife } from "@/lib/score";
import type { Appearance, GameState, Lang } from "@/types/game";

const SAVE_KEY = "spare-change:save";
const LAST_KEY = "spare-change:last-life";
const SETTINGS_KEY = "spare-change:settings";
const ENDINGS_KEY = "spare-change:endings";
const PLAYER_KEY = "spare-change:player";
const RUN_KEY = "spare-change:last-run";
const NICK_KEY = "spare-change:nickname";
const DAILY_KEY = "spare-change:daily";
const CAREER_KEY = "spare-change:career";
const ACH_KEY = "spare-change:achievements";
const LIVES_KEY = "spare-change:lives";

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — play continues without autosave */
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function isUsable(s: GameState | null): s is GameState {
  return !!s && s.version === SAVE_VERSION && typeof s.day === "number" && !!s.character;
}

export function loadGame(): GameState | null {
  const s = read<GameState>(SAVE_KEY);
  return isUsable(s) ? s : null;
}

export function saveGame(s: GameState) {
  write(SAVE_KEY, s);
}

export function clearGame() {
  remove(SAVE_KEY);
}

export function loadLastLife(): GameState | null {
  const s = read<GameState>(LAST_KEY);
  return isUsable(s) && s.ended ? s : null;
}

export function saveLastLife(s: GameState) {
  write(LAST_KEY, s);
  if (s.ended) {
    const found = new Set(loadEndingsFound());
    found.add(s.ended.endingId);
    write(ENDINGS_KEY, Array.from(found));
    recordCareer(s, found);
  }
}

export function loadCareer(): Career {
  const c = read<Career>(CAREER_KEY);
  return c && typeof c.lives === "number" ? { ...EMPTY_CAREER, ...c } : { ...EMPTY_CAREER };
}

/** A finished life, kept small for the history page. */
export interface PastLife {
  key: string;
  at: number;
  seed: number;
  name_th: string;
  name_en: string;
  appearance: Appearance;
  ageStart: number;
  ageEnd: number;
  /** Starting city first. */
  cities: string[];
  days: number;
  endingId: string;
  score: number;
  daily?: string;
  dog: boolean;
}

const MAX_PAST_LIVES = 100;

function pastLife(s: GameState): PastLife {
  return {
    key: lifeKey(s),
    at: Date.now(),
    seed: s.seed,
    name_th: s.character.name_th,
    name_en: s.character.name_en,
    appearance: s.character.appearance,
    ageStart: s.character.ageStart,
    ageEnd: s.ended?.age ?? s.age,
    cities: s.citiesLived,
    days: s.ended?.day ?? s.day,
    endingId: s.ended?.endingId ?? "",
    score: scoreLife(s)?.total ?? 0,
    daily: s.daily,
    dog: !!s.companion,
  };
}

/** Finished lives on this device, newest first. */
export function loadPastLives(): PastLife[] {
  const v = read<PastLife[]>(LIVES_KEY);
  return Array.isArray(v) ? v : [];
}

/** Earned achievements: id -> when, and which life earned it (lifeKey). */
export type Earned = Record<string, { at: number; life: string }>;

export function loadAchievements(): Earned {
  const v = read<Earned>(ACH_KEY);
  return v && typeof v === "object" ? v : {};
}

function recordCareer(s: GameState, endings: Set<string>) {
  const before = loadCareer();
  const career = addLife(before, s);
  if (career === before) return;
  write(CAREER_KEY, career);
  write(LIVES_KEY, [pastLife(s), ...loadPastLives()].slice(0, MAX_PAST_LIVES));
  const earned = loadAchievements();
  const key = lifeKey(s);
  for (const id of newlyEarned({ life: s, career, endings }, new Set(Object.keys(earned)))) {
    earned[id] = { at: Date.now(), life: key };
  }
  write(ACH_KEY, earned);
}

export function loadEndingsFound(): string[] {
  const v = read<string[]>(ENDINGS_KEY);
  return Array.isArray(v) ? v : [];
}

export function saveEndingsFound(ids: string[]) {
  write(ENDINGS_KEY, ids);
}

/** Anonymous random id, so the server can count unique players without a login. */
export function loadPlayerId(): string {
  const existing = read<string>(PLAYER_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  write(PLAYER_KEY, id);
  return id;
}

/** Only used when restoring a profile from a recovery code on a new device. */
export function savePlayerId(id: string) {
  write(PLAYER_KEY, id);
}

/** Dates (YYYY-MM-DD) of daily challenges already started on this device. */
export function loadDailyStarted(): string[] {
  const v = read<string[]>(DAILY_KEY);
  return Array.isArray(v) ? v : [];
}

export function markDailyStarted(date: string) {
  // keep a short history — only "today" matters
  write(DAILY_KEY, [date, ...loadDailyStarted().filter((d) => d !== date)].slice(0, 7));
}

/** Leaderboard submission for the last life: runId once verified, name once claimed. */
export interface LastRun {
  seed: number;
  endingDay: number;
  runId?: string;
  score?: number;
  rank?: number;
  name?: string;
  /** Set when the server counted this life for that day's daily board. */
  daily?: string;
  dailyRank?: number;
}

export function loadLastRun(): LastRun | null {
  return read<LastRun>(RUN_KEY);
}

export function saveLastRun(r: LastRun) {
  write(RUN_KEY, r);
}

export function loadNickname(): string {
  return read<string>(NICK_KEY) ?? "";
}

export function saveNickname(n: string) {
  write(NICK_KEY, n);
}

export interface Settings {
  lang: Lang;
  sound: boolean;
}

export function loadSettings(): Settings | null {
  const s = read<Settings>(SETTINGS_KEY);
  if (!s || (s.lang !== "th" && s.lang !== "en")) return null;
  return { lang: s.lang, sound: !!s.sound };
}

export function saveSettings(s: Settings) {
  write(SETTINGS_KEY, s);
}
