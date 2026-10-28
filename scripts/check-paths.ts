// Plays lives that commit to one way of living (one of the data-driven "activity" actions) and
// reports how often each path reaches its own ending. The auto-sim never picks these actions,
// so `npm run simulate` alone can't tell whether a path is reachable.
// Run: npx tsx scripts/check-paths.ts [lives=40]

import { actionViews, newGame, step } from "../lib/engine";
import { DATA } from "../lib/data";
import type { GameState } from "../types/game";

const LIVES = Number(process.argv[2] ?? 40);
const PATHS: Record<string, string> = {
  chalk_art: "chalk_gallery",
  journal: "memoir",
  volunteer: "kitchen_heart",
  night_watch: "night_guard",
  library: "second_chance_exam",
  fish: "boat_crew",
  carry_bags: "porter_boss",
};
// keeps the character alive and presentable between path actions, most urgent first
const CARE: [string, (s: GameState) => boolean][] = [
  ["clinic", (s) => s.flags.includes("sick") || s.flags.includes("injured")],
  ["charity", (s) => s.stats.hunger < 45],
  ["buy_food", (s) => s.stats.hunger < 45],
  ["buy_water", (s) => s.stats.thirst < 50],
  ["wash", (s) => s.stats.hygiene < 45],
  ["ngo", (s) => s.stats.hygiene < 45],
  ["talk", (s) => s.stats.rep < 45],
  ["sleep", (s) => s.phase === "night" && s.stats.energy < 60],
  ["rest", (s) => s.stats.energy < 30],
];
const EARN = ["beg", "recycle", "carry_bags", "queue_job"];

function play(path: string, seed: number): GameState {
  let s = step(newGame(seed), { type: "revealDone" });
  for (let guard = 0; !s.ended && guard < 20000; guard++) {
    if (s.pendingEvent) {
      // take the first choice the player is allowed — the path's offers put "accept" first
      const ev = DATA.event[s.pendingEvent];
      let next = s;
      for (let i = 0; i < ev.choices.length && next === s; i++) next = step(s, { type: "choose", choiceIndex: i });
      s = next === s ? { ...s, pendingEvent: null } : next;
      continue;
    }
    if (s.eventResult) {
      s = step(s, { type: "dismiss" });
      continue;
    }
    if (s.summary) {
      s = step(s, { type: "clearSummary" });
      continue;
    }
    const open = new Set(actionViews(s).filter((v) => !v.lock).map((v) => v.def.id));
    const care = CARE.find(([id, need]) => open.has(id) && need(s))?.[0];
    const want = s.cash < 2 * DATA.city[s.cityId].meal ? EARN.find((id) => open.has(id)) : undefined;
    const id = care ?? (open.has(path) ? path : want) ?? ["sleep", "rest", "beg", "recycle"].find((x) => open.has(x));
    if (!id) break;
    const next = step(s, { type: "act", actionId: id });
    if (next === s) break;
    s = next;
  }
  return s;
}

for (const [path, ending] of Object.entries(PATHS)) {
  const counts: Record<string, number> = {};
  let hit = 0;
  for (let n = 0; n < LIVES; n++) {
    const s = play(path, (n * 2246822519 + path.length * 97) >>> 0);
    const end = s.ended?.endingId ?? "unfinished";
    counts[end] = (counts[end] ?? 0) + 1;
    if (end === ending) hit++;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${v}`).join(", ");
  console.log(`${path.padEnd(12)} → ${ending.padEnd(20)} ${String(hit).padStart(3)}/${LIVES}   (${top})`);
}
