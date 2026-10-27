"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Flag from "@/components/Flag";
import type { BoardEntry } from "@/app/api/leaderboard/route";
import { DATA } from "@/lib/data";
import { dailyDate, dailyNumber } from "@/lib/daily";
import { formatNumber } from "@/lib/format";
import { useSettings } from "@/lib/i18n";
import { loadLastRun } from "@/lib/storage";

type Board = "daily" | "week" | "all" | "city";
const BOARDS: Board[] = ["daily", "week", "all", "city"];

interface Stats {
  players: number;
  started: number;
  ended: number;
  today: { players: number; started: number };
  endings: { id: string; n: number }[];
}

export default function LeaderboardPage() {
  const { lang, setLang, t } = useSettings();
  const [board, setBoard] = useState<Board>("all");
  const [city, setCity] = useState(DATA.cities[0].id);
  const [entries, setEntries] = useState<BoardEntry[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [offline, setOffline] = useState(false);
  const [mine, setMine] = useState<string | undefined>();

  useEffect(() => {
    const b = new URLSearchParams(window.location.search).get("board") as Board | null;
    if (b && BOARDS.includes(b)) setBoard(b);
    setMine(loadLastRun()?.name);
    fetch("/api/stats")
      .then((r) => r.json())
      .then((s) => (s.ok ? setStats(s) : setOffline(true)))
      .catch(() => setOffline(true));
  }, []);

  useEffect(() => {
    let alive = true;
    setEntries(null);
    const q = new URLSearchParams({ board, ...(board === "city" ? { city } : {}) });
    fetch(`/api/leaderboard?${q}`)
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        if (res.ok) setEntries(res.entries);
        else setOffline(true);
      })
      .catch(() => alive && setOffline(true));
    return () => {
      alive = false;
    };
  }, [board, city]);

  const cityName = (id: string) => {
    const c = DATA.city[id];
    return c ? (lang === "th" ? c.name_th : c.name_en) : id;
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-200">
          ← {t("end.home")}
        </Link>
        <button type="button" onClick={() => setLang(lang === "th" ? "en" : "th")} className="rounded border border-night-600 px-2.5 py-1 text-xs hover:bg-night-800">
          {t("lang.toggle")}
        </button>
      </div>

      <h1 className="lamp-glow text-center font-pixel text-4xl font-bold text-lamp-300">🏆 {t("lb.title")}</h1>

      {offline ? (
        <p className="mt-8 text-center text-sm text-stone-400">{t("lb.offline")}</p>
      ) : (
        <>
          {stats && (
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["👥", t("lb.stat.players"), stats.players],
                  ["🎲", t("lb.stat.started"), stats.started],
                  ["🏁", t("lb.stat.ended"), stats.ended],
                  ["☀️", t("lb.stat.today"), stats.today.players],
                ] as const
              ).map(([icon, label, value]) => (
                <div key={label} className="rounded-lg bg-night-800 p-3 text-center">
                  <dt className="text-[11px] text-stone-400">
                    {icon} {label}
                  </dt>
                  <dd className="font-medium tabular-nums text-lg text-stone-100">{formatNumber(value)}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {BOARDS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBoard(b)}
                className={`rounded-full px-4 py-1.5 text-sm ${board === b ? "bg-lamp-500 font-semibold text-black" : "border border-night-600 text-stone-300 hover:bg-night-800"}`}
              >
                {b === "daily" ? `📅 ${t("lb.board.daily", { n: dailyNumber(dailyDate()) })}` : t(`lb.board.${b}`)}
              </button>
            ))}
            {board === "city" && (
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-lg border border-night-600 bg-night-900 px-3 py-1.5 text-sm outline-none focus:border-lamp-500"
              >
                {DATA.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.flag} {lang === "th" ? c.name_th : c.name_en}
                  </option>
                ))}
              </select>
            )}
          </div>

          <section className="mt-4 overflow-hidden rounded-xl border border-night-700 bg-night-900">
            {entries === null ? (
              <p className="p-6 text-center text-sm text-stone-500">…</p>
            ) : entries.length === 0 ? (
              <p className="p-6 text-center text-sm text-stone-400">{t("lb.empty")}</p>
            ) : (
              <ol>
                {entries.map((e) => {
                  const ending = DATA.ending[e.endingId];
                  return (
                    <li
                      key={`${e.rank}-${e.at}`}
                      className={`flex items-center gap-3 border-b border-night-800 px-4 py-2.5 last:border-0 ${mine && e.name === mine ? "bg-lamp-500/10" : ""}`}
                    >
                      <span className={`w-7 text-right font-semibold tabular-nums ${e.rank <= 3 ? "text-lamp-300" : "text-stone-500"}`}>
                        {e.rank <= 3 ? ["🥇", "🥈", "🥉"][e.rank - 1] : e.rank}
                      </span>
                      <Flag cityId={e.cityId} size={20} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-stone-100">{e.name}</div>
                        <div className="truncate text-[11px] text-stone-500">
                          {ending?.icon} {ending ? (lang === "th" ? ending.title_th : ending.title_en) : e.endingId} · {cityName(e.cityId)} ·{" "}
                          {t("lb.days", { days: formatNumber(e.days) })}
                        </div>
                      </div>
                      <span className="font-semibold tabular-nums text-lamp-300">{formatNumber(e.score)}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {stats && stats.endings.length > 0 && (
            <section className="mt-6 rounded-xl border border-night-700 bg-night-900 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-lamp-300">{t("lb.commonEndings")}</h2>
              <ul className="space-y-1.5 text-sm">
                {stats.endings.slice(0, 8).map(({ id, n }) => {
                  const ending = DATA.ending[id];
                  return (
                    <li key={id} className="flex justify-between gap-3 text-stone-300">
                      <span className="truncate">
                        {ending?.icon} {ending ? (lang === "th" ? ending.title_th : ending.title_en) : id}
                      </span>
                      <span className="tabular-nums text-stone-500">{Math.round((n / Math.max(1, stats.ended)) * 100)}%</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <p className="mt-6 text-center text-[11px] leading-relaxed text-stone-500">{t("lb.howScore")}</p>
        </>
      )}
    </main>
  );
}
