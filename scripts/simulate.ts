// Headless balance check: plays many lives with the auto-sim and reports outcomes.
// Run: npm run simulate -- [lives=200] [strategy=balanced]

import { newGame, simulateDays, step } from "../lib/engine";
import { DATA } from "../lib/data";
import type { GameState, Strategy } from "../types/game";

const lives = Number(process.argv[2] ?? 200);
const strategy = (process.argv[3] ?? "balanced") as Strategy;
const MAX_DAYS = 365 * 12;

const endings: Record<string, number> = {};
const days: number[] = [];
const eventsSeen = new Set<string>();
const cityDeaths: Record<string, number[]> = {};

function resolvePending(s: GameState): GameState {
  // The auto-sim stops at major events for the player; pick the first allowed choice.
  const ev = DATA.event[s.pendingEvent!];
  for (let i = 0; i < ev.choices.length; i++) {
    const next = step(s, { type: "choose", choiceIndex: i });
    if (next !== s) return step(next, { type: "dismiss" });
  }
  return { ...s, pendingEvent: null };
}

for (let n = 0; n < lives; n++) {
  let s = newGame((n * 2654435761) >>> 0);
  s = step(s, { type: "revealDone" });
  let guard = 0;
  while (!s.ended && s.day < MAX_DAYS && guard++ < 20000) {
    if (s.pendingEvent) {
      s = resolvePending(s);
      continue;
    }
    if (s.eventResult) {
      s = step(s, { type: "dismiss" });
      continue;
    }
    s = simulateDays(s, 30, strategy);
    s = step(s, { type: "clearSummary" });
  }
  Object.keys(s.eventHistory).forEach((id) => eventsSeen.add(id));
  const id = s.ended?.endingId ?? "(still alive)";
  endings[id] = (endings[id] ?? 0) + 1;
  const d = s.ended?.day ?? s.day;
  days.push(d);
  (cityDeaths[s.citiesLived[0]] ??= []).push(d);
}

days.sort((a, b) => a - b);
const q = (p: number) => days[Math.floor(days.length * p)];
console.log(`${lives} lives, strategy=${strategy}`);
console.log(`days survived — p10: ${q(0.1)}  median: ${q(0.5)}  p90: ${q(0.9)}`);
Object.entries(endings)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(`${String(v).padStart(4)}  ${k}`));
console.log("median days by starting city:");
Object.entries(cityDeaths).forEach(([c, arr]) => {
  arr.sort((a, b) => a - b);
  console.log(`  ${c.padEnd(12)} n=${String(arr.length).padStart(3)} median=${arr[Math.floor(arr.length / 2)]}`);
});
const unseen = DATA.events.filter((e) => !eventsSeen.has(e.id)).map((e) => e.id);
console.log(`events seen: ${eventsSeen.size}/${DATA.events.length}`);
if (unseen.length) console.log("never fired:", unseen.join(", "));
