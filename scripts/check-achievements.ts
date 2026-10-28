// Plays N lives with the auto-sim and folds them into a career, to check which achievements
// are reachable and how often each one is earned. Run: npm run check-achievements -- [lives=150]

import { ACHIEVEMENTS, addLife, EMPTY_CAREER, newlyEarned } from "../lib/achievements";
import { DATA } from "../lib/data";
import { newGame, simulateDays, step } from "../lib/engine";
import type { GameState } from "../types/game";

const lives = Number(process.argv[2] ?? 150);
const counts: Record<string, number> = {};
let career = EMPTY_CAREER;
const endings = new Set<string>();
const have = new Set<string>();
const firstAt: Record<string, number> = {};

function play(seed: number): GameState {
  let s = step(newGame(seed), { type: "revealDone" });
  let guard = 0;
  while (!s.ended && guard++ < 20000) {
    if (s.pendingEvent) {
      const ev = DATA.event[s.pendingEvent];
      let moved = false;
      for (let i = 0; i < ev.choices.length && !moved; i++) {
        const next = step(s, { type: "choose", choiceIndex: i });
        if (next !== s) {
          s = step(next, { type: "dismiss" });
          moved = true;
        }
      }
      if (!moved) s = { ...s, pendingEvent: null };
      continue;
    }
    if (s.eventResult) s = step(s, { type: "dismiss" });
    else if (s.summary) s = step(s, { type: "clearSummary" });
    else s = simulateDays(s, 30, "balanced");
  }
  return s;
}

for (let n = 0; n < lives; n++) {
  const s = play((n * 2654435761 + 7) >>> 0);
  if (!s.ended) continue;
  const next = addLife(career, s);
  if (next === career) throw new Error("life counted twice?");
  if (addLife(next, s) !== next) throw new Error("dedupe failed");
  career = next;
  endings.add(s.ended.endingId);
  for (const a of ACHIEVEMENTS) if (a.test({ life: s, career, endings })) counts[a.id] = (counts[a.id] ?? 0) + 1;
  for (const id of newlyEarned({ life: s, career, endings }, have)) {
    have.add(id);
    firstAt[id] = n + 1;
  }
}

console.log(`career: ${career.lives} lives, ${career.escapes} escapes, ${career.cities.length} cities, best score ${career.bestScore}`);
for (const a of ACHIEVEMENTS) {
  console.log(`${a.id.padEnd(16)} ${String(counts[a.id] ?? 0).padStart(4)}  first at life ${firstAt[a.id] ?? "-"}`);
}
