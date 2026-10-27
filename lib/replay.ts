// Server-side verification: rebuild a life from its seed and recorded actions with the same pure
// engine the browser uses. Whatever the client claims, only the replayed result counts.

import { newGame, step } from "@/lib/engine";
import type { GameAction, GameState, Strategy } from "@/types/game";

export const MAX_ACTIONS = 40000;

const STRATEGIES: Strategy[] = ["safe", "balanced", "risky"];
const isInt = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x);

/** Accepts only well-formed actions — anything else rejects the whole run. */
export function parseAction(x: unknown): GameAction | null {
  if (typeof x !== "object" || x === null) return null;
  const a = x as Record<string, unknown>;
  switch (a.type) {
    case "act":
      if (typeof a.actionId !== "string" || a.actionId.length > 64) return null;
      if (a.spotId !== undefined && (typeof a.spotId !== "string" || a.spotId.length > 64)) return null;
      return { type: "act", actionId: a.actionId, spotId: a.spotId as string | undefined };
    case "choose":
      return isInt(a.choiceIndex) && a.choiceIndex >= 0 && a.choiceIndex < 16 ? { type: "choose", choiceIndex: a.choiceIndex } : null;
    case "skip":
      return isInt(a.days) && a.days > 0 && a.days <= 366 && STRATEGIES.includes(a.strategy as Strategy)
        ? { type: "skip", days: a.days, strategy: a.strategy as Strategy }
        : null;
    case "dismiss":
    case "clearSummary":
    case "revealDone":
      return { type: a.type };
    default:
      return null;
  }
}

export function replayLife(seed: number, actions: GameAction[]): GameState | null {
  let s = newGame(seed);
  for (const a of actions) {
    const next = step(s, a);
    // the client only records actions that changed the state, so a no-op means a forged log
    if (next === s) return null;
    s = next;
  }
  return s.ended ? s : null;
}
