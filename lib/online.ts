// Client calls to the online API. Every call fails soft: if the server or database is down,
// the game carries on exactly as it does offline.

import { newGame } from "@/lib/engine";
import { loadEndingsFound, loadNickname, loadPlayerId, saveEndingsFound, saveGame, savePlayerId } from "@/lib/storage";
import type { GameState } from "@/types/game";
import type { ScoreBreakdown } from "@/lib/score";

type Result<T> = (T & { ok: true }) | { ok: false; error: string };

async function call<T>(url: string, body?: unknown): Promise<Result<T>> {
  try {
    const res = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return await res.json();
  } catch {
    return { ok: false, error: "network" };
  }
}

/** Starts and saves a new life, and counts it online in the background. */
export function startLife(seed: number, daily?: string) {
  const s = newGame(seed);
  saveGame(daily ? { ...s, daily } : s);
  void call("/api/track", { playerId: loadPlayerId(), name: loadNickname() });
}

export interface DailyInfo {
  date: string;
  number: number;
  seed: number;
}

export const fetchDaily = () => call<DailyInfo>("/api/daily");

export interface RunResult {
  runId: string;
  score: ScoreBreakdown;
  rank: number;
  daily: string | null;
  dailyRank: number | null;
}

export function submitRun(life: GameState) {
  return call<RunResult>("/api/runs", {
    seed: life.seed,
    actions: life.actions ?? [],
    playerId: loadPlayerId(),
    daily: life.daily,
  });
}

export function claimRun(runId: string, name: string) {
  return call<{ rank: number; dailyRank: number | null; name: string }>("/api/leaderboard", { runId, name, playerId: loadPlayerId() });
}

/** Merges local and server endings both ways; returns the merged list. */
export async function syncEndings(): Promise<string[]> {
  const local = loadEndingsFound();
  const res = await call<{ endings: string[] }>("/api/profile", { action: "sync", playerId: loadPlayerId(), endings: local });
  if (!res.ok) return local;
  const merged = Array.from(new Set([...local, ...res.endings]));
  saveEndingsFound(merged);
  return merged;
}

export const getRecoveryCode = () => call<{ code: string }>("/api/profile", { action: "code", playerId: loadPlayerId() });

/** Switches this device to the player behind `code` and merges their endings in. */
export async function restoreProfile(code: string): Promise<Result<{ endings: string[] }>> {
  const res = await call<{ playerId: string; endings: string[] }>("/api/profile", { action: "restore", code });
  if (!res.ok) return res;
  savePlayerId(res.playerId);
  return { ok: true, endings: await syncEndings() };
}

export interface Trace {
  id: number;
  kind: "note" | "grave" | "free";
  nameTh: string;
  nameEn: string;
  age: number;
  day: number;
  endingId: string | null;
  body: string | null;
  candles: number;
  lit: boolean;
  at: number;
}

export function fetchTraces(city: string, spot: string) {
  const p = new URLSearchParams({ city, spot, playerId: loadPlayerId() });
  return call<{ traces: Trace[]; total: number }>(`/api/traces?${p.toString()}`);
}

/** Leaves a note at the spot the character is standing, signed with the character's name. */
export function leaveNote(life: GameState, spot: string, text: string) {
  return call<{ id: number }>("/api/traces", {
    action: "note",
    playerId: loadPlayerId(),
    city: life.cityId,
    spot,
    nameTh: life.character.name_th,
    nameEn: life.character.name_en,
    age: life.age,
    day: life.day,
    text,
  });
}

export type FeedbackKind = "bug" | "idea" | "other";

/** Sends a bug report or idea; a life in progress attaches its city, day and seed so a bug can be replayed. */
export function sendFeedback(input: { kind: FeedbackKind; text: string; contact: string; page: string; lang: string; life?: GameState | null }) {
  const { life, ...rest } = input;
  return call<{ id: number }>("/api/feedback", {
    ...rest,
    playerId: loadPlayerId(),
    city: life?.cityId,
    day: life?.day,
    seed: life?.seed,
  });
}

export const lightCandle = (traceId: number) => call<{ candles: number }>("/api/traces", { action: "candle", playerId: loadPlayerId(), traceId });
