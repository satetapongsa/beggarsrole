// GET ?sort=score|days|money (&name=)  → every finished life since launch (named or not), top 100, with
// details, plus the all-time records (longest survival, most money at the end, best score), totals,
// every player name with how many lives it started and its bests, and the survivors' hall: players
// who got off the street alive, ranked by how many days their longest surviving life lasted. &name= limits the lives to one player.
// GET ?life=<runId>  → one life's full story: where it ended, why, its timeline and final stats.
// GET ?day=YYYY-MM-DD  → the daily survival board: lives finished that Bangkok day, one row per name
// (their longest life that day, whether it escaped or died), longest first. Each day starts empty.
// Unlike /api/leaderboard this does not fold a name into one row: each life is its own entry.

import { DATA } from "@/lib/data";
import { isDailyDate } from "@/lib/daily";
import { getDb, json, offline } from "@/lib/db";

export const dynamic = "force-dynamic";

const TOP = 100;

export interface LifeEntry {
  id: string;
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

/** A player who survived: their longest life that ended off the street rather than in death. */
export interface SurvivorRow {
  id: string;
  rank: number;
  name: string;
  days: number;
  age: number;
  endingId: string;
  cityId: string;
  /** how many of their lives got off the street */
  survived: number;
  at: number;
}

export interface LifeStory {
  id: string;
  name: string | null;
  endingId: string;
  cityId: string;
  endCityId: string | null;
  endSpotId: string | null;
  /** cause of death; null for a life that got off the street */
  cause: string | null;
  days: number;
  age: number;
  money: number | null;
  moneyThb: number | null;
  score: number;
  charTh: string | null;
  charEn: string | null;
  originId: string | null;
  story: {
    timeline: { day: number; age: number; icon: string; th: string; en: string; kind: string }[];
    stats: Record<string, number>;
    earned: number;
    friends: number;
    helped: number;
    mealsGiven: number;
    nightsShelter: number;
    cities: number;
  } | null;
  at: number;
}

/** One player's longest life on a given day. */
export interface DayRow {
  id: string;
  rank: number;
  name: string;
  days: number;
  age: number;
  score: number;
  endingId: string;
  cityId: string;
  /** lives this name finished that day */
  lives: number;
  at: number;
}

export interface Records {
  totalDays: number;
  avgDays: number;
  escaped: number;
  longest: LifeEntry | null;
  richest: LifeEntry | null;
  best: LifeEntry | null;
}

const COLS = `id, name, score, ending_id, city_id, end_city_id, days, age, money, money_thb, char_th, char_en,
  origin_id, cities, daily is not null as daily, created_at`;

function toEntry(r: Record<string, unknown>, i: number): LifeEntry {
  const num = (x: unknown) => (x === null || x === undefined ? null : Number(x));
  return {
    id: String(r.id),
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
  const lifeId = params.get("life");
  if (lifeId !== null) {
    if (!/^[a-f0-9]{20}$/.test(lifeId)) return json({ ok: false, error: "bad_request" }, 400);
    const [r] = await sql`select ${sql.unsafe(COLS)}, end_spot_id, cause, story from runs where id = ${lifeId} and not hidden`;
    if (!r) return json({ ok: false, error: "not_found" }, 404);
    const e = toEntry(r, 0);
    const life: LifeStory = {
      id: e.id, name: e.name, endingId: e.endingId, cityId: e.cityId, endCityId: e.endCityId,
      endSpotId: r.end_spot_id ? String(r.end_spot_id) : null, cause: r.cause ? String(r.cause) : null,
      days: e.days, age: e.age, money: e.money, moneyThb: e.moneyThb, score: e.score,
      charTh: e.charTh, charEn: e.charEn, originId: e.originId,
      story: (r.story as LifeStory["story"]) ?? null, at: e.at,
    };
    return json({ ok: true, life });
  }
  const day = params.get("day");
  if (day !== null) {
    if (!isDailyDate(day)) return json({ ok: false, error: "bad_request" }, 400);
    // a Bangkok calendar day, as on the rest of the boards
    const [rows, [totals]] = await sql.transaction([
      sql`select id, name, days, age, score, ending_id, city_id, created_at, lives from (
            select distinct on (lower(name)) id, name, days, age, score, ending_id, city_id, created_at,
                   count(*) over (partition by lower(name))::int as lives
            from runs
            where name is not null and not hidden
              and created_at >= ${day}::date::timestamp at time zone 'Asia/Bangkok'
              and created_at < (${day}::date + 1)::timestamp at time zone 'Asia/Bangkok'
            order by lower(name), days desc, score desc, created_at
          ) best order by days desc, score desc, created_at limit ${TOP}`,
      sql`select count(*)::int as lives, count(distinct lower(name))::int as players from runs
          where not hidden
            and created_at >= ${day}::date::timestamp at time zone 'Asia/Bangkok'
            and created_at < (${day}::date + 1)::timestamp at time zone 'Asia/Bangkok'`,
    ]);
    const entries: DayRow[] = rows.map((r, i) => ({
      id: String(r.id),
      rank: i + 1,
      name: String(r.name),
      days: Number(r.days),
      age: Number(r.age),
      score: Number(r.score),
      endingId: String(r.ending_id),
      cityId: String(r.city_id),
      lives: Number(r.lives),
      at: new Date(String(r.created_at)).getTime(),
    }));
    return json({ ok: true, day, entries, lives: Number(totals.lives), players: Number(totals.players) });
  }
  const sort = params.get("sort") ?? "score";
  const name = params.get("name") || null;
  const order = ORDER[sort];
  if (!order) return json({ ok: false, error: "bad_request" }, 400);

  const deaths = DATA.endings.filter((e) => e.death).map((e) => e.id);
  const [rows, [totals], longest, richest, best, players, survivors] = await sql.transaction([
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
    sql`select id, name, days, age, ending_id, city_id, created_at, survived from (
          select distinct on (lower(name)) id, name, days, age, ending_id, city_id, created_at,
                 count(*) over (partition by lower(name))::int as survived
          from runs where name is not null and not hidden and ending_id <> all(${deaths})
          order by lower(name), days desc, created_at
        ) best order by days desc, created_at limit ${TOP}`,
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
  const survivorRows: SurvivorRow[] = survivors.map((r, i) => ({
    id: String(r.id),
    rank: i + 1,
    name: String(r.name),
    days: Number(r.days),
    age: Number(r.age),
    endingId: String(r.ending_id),
    cityId: String(r.city_id),
    survived: Number(r.survived),
    at: new Date(String(r.created_at)).getTime(),
  }));
  return json({ ok: true, entries: rows.map(toEntry), records, players: playerRows, survivors: survivorRows });
}
