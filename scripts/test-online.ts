// End-to-end check of the online API against a running server + real database.
// Plays real lives with the engine, submits/claims them, checks every endpoint, then deletes
// everything it created (test player ids start with "e2etest-").
// Run: npm run dev, then npm run test:online -- [baseUrl=http://localhost:3000]

import { neon } from "@neondatabase/serverless";
import { actionViews, newGame, step } from "../lib/engine";
import { DATA } from "../lib/data";
import { Rng } from "../lib/rng";
import type { GameAction, GameState } from "../types/game";

const BASE = process.argv[2] ?? "http://localhost:3000";
const RUN_TAG = Date.now().toString(36);
const P1 = `e2etest-${RUN_TAG}-a`;
const P2 = `e2etest-${RUN_TAG}-b`;
let failures = 0;

function check(label: string, ok: unknown, detail?: unknown) {
  if (ok) console.log(`✓ ${label}`);
  else {
    failures++;
    console.log(`✗ ${label}`, detail ?? "");
  }
}

async function api(path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

/** Plays a life to its end the way the UI does, recording state-changing actions. */
function play(seed: number, salt = 0): GameState {
  const rng = new Rng((seed ^ 0x5bd1e995) + salt);
  let s = newGame(seed);
  const actions: GameAction[] = [];
  for (let guard = 0; !(s.ended && !s.eventResult) && guard < 30000; guard++) {
    let a: GameAction;
    if (s.eventResult) a = { type: "dismiss" };
    else if (s.summary) a = { type: "clearSummary" };
    else if (!s.revealed) a = { type: "revealDone" };
    else if (s.pendingEvent) a = { type: "choose", choiceIndex: rng.int(0, DATA.event[s.pendingEvent].choices.length - 1) };
    else {
      const open = actionViews(s).filter((v) => !v.lock);
      a = { type: "act", actionId: open[rng.int(0, open.length - 1)].def.id };
    }
    const next = step(s, a);
    if (next !== s) actions.push(a);
    s = next;
  }
  return { ...s, actions };
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    check("track start", (await api("/api/track", { playerId: P1 })).body.ok);

    const life = play(424242);
    const sub = await api("/api/runs", { seed: life.seed, actions: life.actions, playerId: P1 });
    check("submit verified run", sub.body.ok && sub.body.score.total > 0, sub.body);
    const again = await api("/api/runs", { seed: life.seed, actions: life.actions, playerId: P1 });
    check("resubmit is idempotent", again.body.runId === sub.body.runId);
    const [{ n }] = await sql`select count(*)::int as n from runs where player_id = ${P1}`;
    check("run stored once", n === 1, n);

    const forged = await api("/api/runs", { seed: life.seed, actions: life.actions!.slice(0, -3), playerId: P1 });
    check("truncated log rejected", forged.status === 422, forged.body);

    check("blocked name refused", (await api("/api/leaderboard", { runId: sub.body.runId, playerId: P1, name: "f.u.c.k" })).status === 422);
    check("someone else can't claim", (await api("/api/leaderboard", { runId: sub.body.runId, playerId: P2, name: "thief" })).status === 404);
    const claim = await api("/api/leaderboard", { runId: sub.body.runId, playerId: P1, name: `ทดสอบ ${RUN_TAG}` });
    check("claim with Thai name", claim.body.ok && claim.body.rank >= 1, claim.body);
    check("double claim refused", (await api("/api/leaderboard", { runId: sub.body.runId, playerId: P1, name: "again" })).status === 409);

    for (const q of ["board=all", "board=week", `board=city&city=${life.citiesLived[0]}`]) {
      const lb = await api(`/api/leaderboard?${q}`);
      check(`board ${q} lists the run`, lb.body.entries?.some((e: { name: string }) => e.name === `ทดสอบ ${RUN_TAG}`), lb.body);
    }

    const daily = (await api("/api/daily")).body;
    check("daily seed served", daily.ok && Number.isInteger(daily.seed), daily);
    const d1 = play(daily.seed);
    const ds = await api("/api/runs", { seed: d1.seed, actions: d1.actions, playerId: P2, daily: daily.date });
    check("first daily run counts", ds.body.daily === daily.date, ds.body);
    // a second daily attempt by the same player is a valid run but not a daily one
    const d2 = play(daily.seed, 1);
    const ds2 = await api("/api/runs", { seed: d2.seed, actions: d2.actions, playerId: P2, daily: daily.date });
    check("second daily attempt doesn't count", ds2.body.ok && ds2.body.runId !== ds.body.runId && ds2.body.daily === null, ds2.body);
    const fake = play((daily.seed ^ 1) >>> 0);
    const ds3 = await api("/api/runs", { seed: fake.seed, actions: fake.actions, playerId: P1, daily: daily.date });
    check("wrong seed with daily flag ignored", ds3.body.ok && ds3.body.daily === null, ds3.body);
    await api("/api/leaderboard", { runId: ds.body.runId, playerId: P2, name: `daily ${RUN_TAG}` });
    const db = await api(`/api/leaderboard?board=daily&date=${daily.date}`);
    check("daily board lists the run", db.body.entries?.some((e: { name: string }) => e.name === `daily ${RUN_TAG}`), db.body);

    // a finished life leaves a grave (or a way-out mark) where it ended
    const [trace] = await sql`select id, kind, city_id, spot_id from traces where run_id = ${sub.body.runId}`;
    check("ended life leaves a trace", trace && (trace.kind === "grave" || trace.kind === "free"), trace);
    const at = `/api/traces?city=${trace.city_id}&spot=${trace.spot_id}&playerId=${P2}`;
    const tr = await api(at);
    check("trace listed at its spot", tr.body.traces?.some((x: { id: number }) => x.id === Number(trace.id)), tr.body);
    const note = { action: "note", playerId: P2, city: trace.city_id, spot: trace.spot_id, nameTh: "ทดสอบ", nameEn: "Test", age: 30, day: 5 };
    const n1 = await api("/api/traces", { ...note, text: `ระวังตำรวจตอนเย็น ${RUN_TAG}` });
    check("leave a note", n1.body.ok && n1.body.id > 0, n1.body);
    check("link in note refused", (await api("/api/traces", { ...note, text: "go to www.spam.com" })).status === 422);
    check("rude note refused", (await api("/api/traces", { ...note, text: "f u c k you" })).status === 422);
    check("note at a made-up spot refused", (await api("/api/traces", { ...note, spot: "nowhere", text: "hello there" })).status === 400);
    const tr2 = await api(at);
    check("note listed first", tr2.body.traces?.[0]?.body === `ระวังตำรวจตอนเย็น ${RUN_TAG}`, tr2.body);
    check("candle on a note refused", (await api("/api/traces", { action: "candle", playerId: P2, traceId: n1.body.id })).status === 404);
    if (trace.kind === "grave") {
      const c1 = await api("/api/traces", { action: "candle", playerId: P2, traceId: Number(trace.id) });
      check("light a candle", c1.body.ok && c1.body.candles === 1, c1.body);
      check("one candle per player", (await api("/api/traces", { action: "candle", playerId: P2, traceId: Number(trace.id) })).status === 409);
      const tr3 = await api(at);
      check("candle shows as lit", tr3.body.traces?.find((x: { id: number }) => x.id === Number(trace.id))?.lit === true, tr3.body);
    }

    const stats = (await api("/api/stats")).body;
    check("stats", stats.ok && stats.players >= 2 && stats.ended >= 2, stats);

    const sync = await api("/api/profile", { action: "sync", playerId: P1, endings: ["off_street", "not_an_ending"] });
    check("sync merges valid endings only", sync.body.endings?.includes("off_street") && !sync.body.endings.includes("not_an_ending"), sync.body);
    const code = await api("/api/profile", { action: "code", playerId: P1 });
    check("recovery code", /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code.body.code ?? ""), code.body);
    const same = await api("/api/profile", { action: "code", playerId: P1 });
    check("code is stable", same.body.code === code.body.code);
    const restore = await api("/api/profile", { action: "restore", code: code.body.code.toLowerCase().replace("-", "") });
    check("restore by code", restore.body.playerId === P1 && restore.body.endings.length >= 1, restore.body);

    check("admin needs token", (await api("/api/admin")).status === 401);
    if (process.env.ADMIN_TOKEN) {
      const auth = { authorization: `Bearer ${process.env.ADMIN_TOKEN}` };
      const adm = await api("/api/admin", undefined, auth);
      check("admin dashboard", adm.body.ok && adm.body.series.length === 30, adm.body);
      check("admin hide", (await api("/api/admin", { action: "hide", runId: sub.body.runId }, auth)).body.ok);
      const lb = await api("/api/leaderboard?board=all");
      check("hidden run gone from board", !lb.body.entries.some((e: { name: string }) => e.name === `ทดสอบ ${RUN_TAG}`));
    }
  } finally {
    await sql.transaction([
      sql`delete from runs where player_id like 'e2etest-%'`,
      sql`delete from trace_candles where trace_id in (select id from traces where player_id like 'e2etest-%')`,
      sql`delete from trace_candles where player_id like 'e2etest-%'`,
      sql`delete from traces where player_id like 'e2etest-%'`,
      sql`delete from player_endings where player_id like 'e2etest-%'`,
      sql`delete from player_days where player_id like 'e2etest-%'`,
      sql`delete from players where id like 'e2etest-%'`,
      sql`delete from rate_limits where key like '%:unknown'`,
    ]);
    console.log("cleaned up test data");
  }
  console.log(failures ? `✗ ${failures} failures` : "✓ all online checks passed");
  process.exit(failures ? 1 : 0);
}

void main();
