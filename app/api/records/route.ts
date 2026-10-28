// GET ?sort=score|days|money (&name=)  → every finished life since launch (named or not), top 100, with
// details, plus the all-time records (longest survival, most money at the end, best score), totals,
// and every player name with how many lives it started and its bests. &name= limits the lives to one player.
// Unlike /api/leaderboard this does not fold a name into one row: each life is its own entry.

import { DATA } from "@/lib/data";
import { getDb, json, offline } from "@/lib/db";

export const dynamic = "force-dynamic";

const TOP = 100;

export interface LifeEntry {
  rank: number;
  name: string | null;
  score: number;
  endingId: string;
  cityId: string;
  endCityId: string | null;
  days: number;
  age: number;
  money: number | null;
  moneyThb: number | null;
  charTh: string | null;
  charEn: string | null;
  originId: string | null;
  cities: number | null;
  daily: boolean;
  at: number;
}

export interface PlayerRow {
  name: string;
  /** lives started under this name — how many times they were reborn */
  starts: number;
  ended: number;
  escaped: number;
  best: number | null;
  longest: number | null;
  richestThb: number | null;
  lastSeen: number;
}

export interface Records {
  totalDays: number;
  avgDays: number;
  escaped: number;
  longest: LifeEntry | null;
  richest: LifeEntry | null;
  best: LifeEntry | null;
}

const COLS = `name, score, ending_id, city_id, end_city_id, days, age, money, money_thb, char_th, char_en,
  origin_id, cities, daily is not null as daily, created_at`;

function toEntry(r: Record<string, unknown>, i: number): LifeEntry {
  const num = (x: unknown) => (x === null || x === undefined ? null : Number(x));
  return {
    rank: i + 1,
    name: r.name ? String(r.name) : null,
    score: Number(r.score),
    endingId: String(r.ending_id),
    cityId: String(r.city_id),
    endCityId: r.end_city_id ? String(r.end_city_id) : null,
    days: Number(r.days),
    age: Number(r.age),
    money: num(r.money),
    moneyThb: num(r.money_thb),
    charTh: r.char_th ? String(r.char_th) : null,
    charEn: r.char_en ? String(r.char_en) : null,
    originId: r.origin_id ? String(r.origin_id) : null,
    cities: num(r.cities),
    daily: Boolean(r.daily),
    at: new Date(String(r.created_at)).getTime(),
  };
}

const ORDER: Record<string, string> = {
  score: "score desc, created_at",
  days: "days desc, score desc, created_at",
  money: "money_thb desc nulls last, score desc, created_at",
};

export async function GET(req: Request) {
  const sql = await getDb();
  if (!sql) return offline();
  const params = new URL(req.url).searchParams;
  const sort = params.get("sort") ?? "score";
  const name = params.get("name") || null;
  const order = ORDER[sort];
  if (!order) return json({ ok: false, error: "bad_request" }, 400);

  const deaths = DATA.endings.filter((e) => e.death).map((e) => e.id);
  const [rows, [totals], longest, richest, best, players] = await sql.transaction([
    sql.query(`select ${COLS} from runs where not hidden and ($1::text is null or lower(name) = lower($1)) order by ${order} limit ${TOP}`, [name]),
    sql`select coalesce(sum(days), 0)::int as "totalDays", coalesce(round(avg(days)), 0)::int as "avgDays",
               count(*) filter (where ending_id <> all(${deaths}))::int as escaped
        from runs where not hidden`,
    sql.query(`select ${COLS} from runs where not hidden order by ${ORDER.days} limit 1`),
    sql.query(`select ${COLS} from runs where not hidden and money_thb is not null order by ${ORDER.money} limit 1`),
    sql.query(`select ${COLS} from runs where not hidden order by ${ORDER.score} limit 1`),
    sql`select n.name, n.starts, n.last_seen as "lastSeen", count(r.id)::int as ended,
               count(r.id) filter (where r.ending_id <> all(${deaths}))::int as escaped,
               max(r.score) as best, max(r.days) as longest, max(r.money_thb) as "richestThb"
        from names n left join runs r on lower(r.name) = lower(n.name) and not r.hidden
        group by n.name, n.starts, n.last_seen
        order by max(r.score) desc nulls last, n.starts desc, n.last_seen desc`,
  ]);

  const records: Records = {
    totalDays: Number(totals.totalDays),
    avgDays: Number(totals.avgDays),
    escaped: Number(totals.escaped),
    longest: longest[0] ? toEntry(longest[0], 0) : null,
    richest: richest[0] ? toEntry(richest[0], 0) : null,
    best: best[0] ? toEntry(best[0], 0) : null,
  };
  const num = (x: unknown) => (x === null ? null : Number(x));
  const playerRows: PlayerRow[] = players.map((p) => ({
    name: String(p.name),
    starts: Math.max(Number(p.starts), Number(p.ended)),
    ended: Number(p.ended),
    escaped: Number(p.escaped),
    best: num(p.best),
    longest: num(p.longest),
    richestThb: num(p.richestThb),
    lastSeen: new Date(String(p.lastSeen)).getTime(),
  }));
  return json({ ok: true, entries: rows.map(toEntry), records, players: playerRows });
}
