// Checks that leaderboard verification works: plays lives through step() the way the UI does
// (recording only actions that changed the state), then replays them from the seed and compares.
// Run: npm run verify-replay -- [lives=100]

import { actionViews, newGame, step } from "../lib/engine";
import { DATA } from "../lib/data";
import { parseAction, replayLife } from "../lib/replay";
import { scoreLife } from "../lib/score";
import { Rng } from "../lib/rng";
import type { GameAction, GameState } from "../types/game";

const lives = Number(process.argv[2] ?? 100);
let failures = 0;
let maxActions = 0;
let totalMs = 0;

function pick(s: GameState, rng: Rng): GameAction {
  if (s.eventResult) return { type: "dismiss" };
  if (s.summary) return { type: "clearSummary" };
  if (!s.revealed) return { type: "revealDone" };
  if (s.pendingEvent) return { type: "choose", choiceIndex: rng.int(0, DATA.event[s.pendingEvent].choices.length - 1) };
  if (s.day > 30 && rng.next() < 0.05) return { type: "skip", days: 7, strategy: "balanced" };
  const open = actionViews(s).filter((v) => !v.lock);
  const v = open[rng.int(0, open.length - 1)];
  const city = DATA.city[s.cityId];
  const spot = city.spots[rng.int(0, city.spots.length - 1)];
  return { type: "act", actionId: v.def.id, spotId: spot.id };
}

for (let n = 0; n < lives; n++) {
  const seed = (n * 2654435761 + 12345) >>> 0;
  const rng = new Rng(seed ^ 0x9e3779b9);
  let s = newGame(seed);
  const actions: GameAction[] = [];
  for (let guard = 0; !(s.ended && !s.eventResult) && guard < 30000; guard++) {
    const a = pick(s, rng);
    const next = step(s, a);
    if (next !== s) actions.push(a);
    s = next;
  }
  if (!s.ended) continue;
  // round-trip through JSON + parseAction, as the API does
  const wire = (JSON.parse(JSON.stringify(actions)) as unknown[]).map(parseAction);
  const t0 = Date.now();
  const replayed = wire.every(Boolean) ? replayLife(seed, wire as GameAction[]) : null;
  totalMs += Date.now() - t0;
  maxActions = Math.max(maxActions, actions.length);
  const a = scoreLife(s)?.total;
  const b = replayed && scoreLife(replayed)?.total;
  if (!replayed || a !== b || replayed.ended?.endingId !== s.ended.endingId) {
    failures++;
    console.log(`✗ seed ${seed}: played ${s.ended.endingId}/${a}, replayed ${replayed?.ended?.endingId}/${b}`);
  }
}

// a forged log must be rejected
const forged = replayLife(1, [{ type: "revealDone" }, { type: "revealDone" }]);
if (forged) failures++;

console.log(`${lives} lives, longest ${maxActions} actions, avg replay ${Math.round(totalMs / lives)}ms`);
console.log(failures ? `✗ ${failures} failures` : "✓ every replay matched");
process.exit(failures ? 1 : 0);
