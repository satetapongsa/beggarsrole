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
      // with real players on the live database the test run may rank below the top 50; then it must sit below the cut
      const rows = (lb.body.entries ?? []) as { name: string; score: number }[];
      const listed = rows.some((e) => e.name === `ทดสอบ ${RUN_TAG}`);
      const belowCut = rows.length === 50 && rows[49].score >= sub.body.score.total;
      check(`board ${q} lists the run (or it ranks below the top 50)`, listed || belowCut, { listed, cut: rows.at(-1)?.score, ours: sub.body.score.total });
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

    const [detail] = await sql`select money, money_thb, end_city_id, char_th, origin_id, cities from runs where id = ${sub.body.runId}`;
    check("run stores money and character details", detail && detail.money !== null && detail.money_thb !== null && detail.end_city_id && detail.char_th && detail.origin_id && detail.cities >= 1, detail);
    for (const sort of ["score", "days", "money"]) {
      const rec = await api(`/api/records?sort=${sort}`);
      check(`records sorted by ${sort}`, rec.body.ok && rec.body.entries.length > 0 && rec.body.records.longest, rec.body);
    }
    const nick = `ทดสอบ ${RUN_TAG}`;
    await api("/api/track", { playerId: P1, name: nick });
    await api("/api/track", { playerId: P1, name: nick });
    check("rude name not recorded at start", (await api("/api/track", { playerId: P1, name: "fuck" })).body.ok);
    const [nrow] = await sql`select starts from names where name = ${nick}`;
    check("name recorded at each start", nrow && Number(nrow.starts) >= 2, nrow);
    check("rude name skipped", !(await sql`select 1 from names where name = 'fuck'`).length);
    const recs = await api(`/api/records?sort=score&name=${encodeURIComponent(nick)}`);
    const prow = recs.body.players?.find((x: { name: string }) => x.name === nick);
    check("players list shows the name with its rebirths and best", prow && prow.starts >= 2 && prow.ended >= 1 && prow.best > 0, prow);
    check("lives filtered to one player", recs.body.entries.length > 0 && recs.body.entries.every((e: { name: string }) => e.name === nick), recs.body.entries);
    // a name is one player whatever its case: MiXeD and mixed share one row and one spelling
    const mixed = `CaseTest ${RUN_TAG}`;
    await api("/api/track", { playerId: P2, name: mixed });
    await api("/api/track", { playerId: P2, name: mixed.toLowerCase() });
    await api("/api/track", { playerId: P2, name: mixed.toUpperCase() });
    const caseRows = await sql`select name, starts from names where lower(name) = lower(${mixed})`;
    check("names match ignoring case", caseRows.length === 1 && caseRows[0].name === mixed && Number(caseRows[0].starts) === 3, caseRows);
    const lifeC = play(4242, 7);
    const subC = await api("/api/runs", { seed: lifeC.seed, actions: lifeC.actions, playerId: P2 });
    const claimC = await api("/api/leaderboard", { runId: subC.body.runId, playerId: P2, name: mixed.toLowerCase() });
    check("claim keeps the first spelling", claimC.body.ok && claimC.body.name === mixed, claimC.body);
    const recC = await api(`/api/records?sort=score&name=${encodeURIComponent(mixed.toUpperCase())}`);
    const pC = recC.body.players?.find((x: { name: string }) => x.name === mixed);
    check("player row counts the life", pC && pC.ended >= 1 && pC.starts === 3, pC);
    check("filter by name ignores case", recC.body.entries.length >= 1 && recC.body.entries.every((e: { name: string }) => e.name === mixed), recC.body.entries);
    const deaths = new Set(DATA.endings.filter((e) => e.death).map((e) => e.id));
    const surv = recC.body.survivors as { name: string; days: number; endingId: string; rank: number }[];
    check("survivors hall lists only lives that got off the street, longest first",
      Array.isArray(surv) && surv.every((x) => !deaths.has(x.endingId)) && surv.every((x, i) => i === 0 || surv[i - 1].days >= x.days) && new Set(surv.map((x) => x.name.toLowerCase())).size === surv.length, surv);
    const story = await api(`/api/records?life=${subC.body.runId}`);
    const ls = story.body.life;
    check("life story has end place, timeline and stats", story.body.ok && ls.endSpotId && ls.story?.timeline?.length > 1 && ls.story.timeline.at(-1).kind === "ending" && typeof ls.story.earned === "number", ls);
    check("death has a cause, escape has none", deaths.has(ls.endingId) ? Boolean(ls.cause) : ls.cause === null, ls);
    check("life story rejects a bad id", (await api("/api/records?life=nope")).status === 400);
    const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
    const dayBoard = await api(`/api/records?day=${today}`);
    const dayRows = dayBoard.body.entries as { name: string; days: number }[];
    check("daily board lists today's lives, one per name, longest first",
      dayBoard.body.ok && dayRows.some((x) => x.name === mixed) && dayRows.every((x, i) => i === 0 || dayRows[i - 1].days >= x.days) && new Set(dayRows.map((x) => x.name.toLowerCase())).size === dayRows.length, dayBoard.body);
    check("daily board for a day nobody played is empty", (await api("/api/records?day=2020-01-01")).body.entries?.length === 0);
    check("daily board rejects a bad date", (await api("/api/records?day=yesterday")).status === 400);
    check("records reject a bad sort", (await api("/api/records?sort=nope")).status === 400);

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
      sql`delete from names where name like ${"%" + RUN_TAG}`,
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
