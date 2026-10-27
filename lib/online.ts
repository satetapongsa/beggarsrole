// Client calls to the online API. Every call fails soft: if the server or database is down,
// the game carries on exactly as it does offline.

import { newGame } from "@/lib/engine";
import { loadPlayerId, saveGame } from "@/lib/storage";
import type { GameState } from "@/types/game";
import type { ScoreBreakdown } from "@/lib/score";

async function post<T>(url: string, body: unknown): Promise<(T & { ok: true }) | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return await res.json();
  } catch {
    return { ok: false, error: "network" };
  }
}

/** Starts and saves a new life, and counts it online in the background. */
export function startLife(seed: number) {
  saveGame(newGame(seed));
  void post("/api/track", { playerId: loadPlayerId() });
}

export function submitRun(life: GameState) {
  return post<{ runId: string; score: ScoreBreakdown; rank: number }>("/api/runs", {
    seed: life.seed,
    actions: life.actions ?? [],
    playerId: loadPlayerId(),
  });
}

export function claimRun(runId: string, name: string) {
  return post<{ rank: number | null }>("/api/leaderboard", { runId, name, playerId: loadPlayerId() });
}
