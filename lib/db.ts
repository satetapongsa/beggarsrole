// Server-only Neon Postgres access + shared API helpers. getDb() returns null when DATABASE_URL is
// not set (e.g. a fresh clone), so online features switch off instead of crashing.
// The schema is created on first use per server instance — every statement is idempotent.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { dailyDate } from "@/lib/daily";

export type Sql = NeonQueryFunction<false, false>;

const SCHEMA = [
  `create table if not exists players (
    id text primary key,
    first_seen timestamptz not null default now(),
    last_seen timestamptz not null default now(),
    recovery_code text unique
  )`,
  `create table if not exists player_days (
    player_id text not null,
    day date not null,
    starts int not null default 0,
    ends int not null default 0,
    primary key (player_id, day)
  )`,
  `create table if not exists runs (
    id text primary key,
    player_id text not null,
    seed bigint not null,
    score int not null,
    ending_id text not null,
    city_id text not null,
    days int not null,
    age int not null,
    daily date,
    name text,
    claimed_at timestamptz,
    hidden boolean not null default false,
    created_at timestamptz not null default now()
  )`,
  // details for the all-time board, added after launch (null on older runs)
  `alter table runs add column if not exists money real`,
  `alter table runs add column if not exists money_thb int`,
  `alter table runs add column if not exists end_city_id text`,
  `alter table runs add column if not exists char_th text`,
  `alter table runs add column if not exists char_en text`,
  `alter table runs add column if not exists origin_id text`,
  `alter table runs add column if not exists cities int`,
  // one row per player name (the name typed before each life): how many lives it started
  `create table if not exists names (
    name text primary key,
    starts int not null default 0,
    first_seen timestamptz not null default now(),
    last_seen timestamptz not null default now()
  )`,
  // names that reached the board before names were recorded at the start of a life
  `insert into names (name, starts, first_seen, last_seen)
    select name, count(*), min(created_at), max(created_at) from runs where name is not null group by name
    on conflict (name) do nothing`,
  `create unique index if not exists runs_one_daily on runs (player_id, daily) where daily is not null`,
  `create index if not exists runs_board on runs (score desc) where name is not null and not hidden`,
  `create index if not exists runs_daily_board on runs (daily, score desc) where name is not null and not hidden`,
  `create index if not exists runs_city_board on runs (city_id, score desc) where name is not null and not hidden`,
  `create table if not exists player_endings (
    player_id text not null,
    ending_id text not null,
    found_at timestamptz not null default now(),
    primary key (player_id, ending_id)
  )`,
  `create table if not exists traces (
    id bigserial primary key,
    player_id text not null,
    kind text not null,
    city_id text not null,
    spot_id text not null,
    run_id text unique,
    name_th text not null,
    name_en text not null,
    age int not null,
    day int not null,
    ending_id text,
    body text,
    candles int not null default 0,
    hidden boolean not null default false,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists traces_spot on traces (city_id, spot_id, created_at desc) where not hidden`,
  `create table if not exists trace_candles (
    trace_id bigint not null,
    player_id text not null,
    primary key (trace_id, player_id)
  )`,
  `create table if not exists feedback (
    id bigserial primary key,
    player_id text not null,
    kind text not null,
    body text not null,
    contact text,
    page text not null,
    lang text not null,
    city_id text,
    day int,
    seed bigint,
    user_agent text,
    resolved boolean not null default false,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists feedback_recent on feedback (created_at desc)`,
  `create table if not exists rate_limits (
    key text primary key,
    n int not null,
    expires_at timestamptz not null
  )`,
];

let client: Sql | null | undefined;
let ready: Promise<unknown> | null = null;

export async function getDb(): Promise<Sql | null> {
  // no-store: Next.js otherwise keeps Neon's HTTP responses in its fetch cache and serves stale rows
  if (client === undefined) client = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL, { fetchOptions: { cache: "no-store" } }) : null;
  if (!client) return null;
  const sql = client;
  ready ??= sql.transaction(SCHEMA.map((q) => sql.query(q))).catch((e) => {
    ready = null; // retry on the next request
    throw e;
  });
  await ready;
  return sql;
}

/** "Today" for stats and the daily challenge — Bangkok time, see lib/daily.ts. */
export const today = () => dailyDate();

export const isPlayerId = (x: unknown): x is string => typeof x === "string" && /^[a-z0-9-]{8,40}$/i.test(x);

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

/** Fixed one-hour window per IP and scope: true while under `max` calls. */
export async function underLimit(sql: Sql, req: Request, scope: string, max: number): Promise<boolean> {
  const key = `${scope}:${clientIp(req)}`;
  const rows = await sql`
    insert into rate_limits (key, n, expires_at) values (${key}, 1, now() + interval '1 hour')
    on conflict (key) do update set
      n = case when rate_limits.expires_at < now() then 1 else rate_limits.n + 1 end,
      expires_at = case when rate_limits.expires_at < now() then now() + interval '1 hour' else rate_limits.expires_at end
    returning n`;
  if (Math.random() < 0.01) await sql`delete from rate_limits where expires_at < now()`;
  return Number(rows[0].n) <= max;
}

export const json = (body: unknown, status = 200) => Response.json(body, { status });
export const offline = () => json({ ok: false, error: "offline" }, 503);
export const badRequest = () => json({ ok: false, error: "bad_request" }, 400);
export const rateLimited = () => json({ ok: false, error: "rate_limited" }, 429);
