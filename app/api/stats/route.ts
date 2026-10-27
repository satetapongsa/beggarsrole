// Public play statistics: players, lives started/finished, today's numbers, most common endings.

import { getRedis, json, K, today } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const redis = getRedis();
  if (!redis) return json({ ok: false, error: "offline" }, 503);
  const d = today();
  const p = redis.pipeline();
  p.pfcount(K.players);
  p.get(K.started);
  p.get(K.ended);
  p.pfcount(K.dayPlayers(d));
  p.get(K.dayStarted(d));
  p.hgetall(K.endings);
  p.hgetall(K.cityRuns);
  p.hgetall(K.cityDays);
  const [players, started, ended, playersToday, startedToday, endings, cityRuns, cityDays] = (await p.exec()) as [
    number,
    number | null,
    number | null,
    number,
    number | null,
    Record<string, number> | null,
    Record<string, number> | null,
    Record<string, number> | null,
  ];
  const cities = Object.entries(cityRuns ?? {}).map(([id, runs]) => ({
    id,
    runs: Number(runs),
    avgDays: Math.round(Number(cityDays?.[id] ?? 0) / Math.max(1, Number(runs))),
  }));
  return json({
    ok: true,
    players,
    started: Number(started ?? 0),
    ended: Number(ended ?? 0),
    today: { players: playersToday, started: Number(startedToday ?? 0) },
    endings: Object.entries(endings ?? {})
      .map(([id, n]) => ({ id, n: Number(n) }))
      .sort((a, b) => b.n - a.n),
    cities: cities.sort((a, b) => b.runs - a.runs),
  });
}
