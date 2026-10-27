// localStorage helpers. Every call is wrapped in try/catch: private mode, quota errors
// or disabled storage must never crash the game.

import { SAVE_VERSION } from "@/lib/engine";
import type { GameState, Lang } from "@/types/game";

const SAVE_KEY = "spare-change:save";
const LAST_KEY = "spare-change:last-life";
const SETTINGS_KEY = "spare-change:settings";
const ENDINGS_KEY = "spare-change:endings";
const PLAYER_KEY = "spare-change:player";
const RUN_KEY = "spare-change:last-run";
const NICK_KEY = "spare-change:nickname";

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
  }
}

export function loadEndingsFound(): string[] {
  const v = read<string[]>(ENDINGS_KEY);
  return Array.isArray(v) ? v : [];
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

/** Leaderboard submission for the last life: runId once verified, name once claimed. */
export interface LastRun {
  seed: number;
  endingDay: number;
  runId?: string;
  score?: number;
  rank?: number;
  name?: string;
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
