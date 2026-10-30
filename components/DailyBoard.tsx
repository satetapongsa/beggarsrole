"use client";

// Daily survival board: who lasted the longest in a life finished on a given Bangkok day. Each day
// starts empty; the last week of days can be browsed. The all-time boards stay as they are.

import { useEffect, useState } from "react";
import type { DayRow } from "@/app/api/records/route";
import Flag from "@/components/Flag";
import LifeStoryPanel from "@/components/LifeStoryPanel";
import { DATA } from "@/lib/data";
import { DAILY_LAUNCH, dailyDate } from "@/lib/daily";
import { formatNumber, tx } from "@/lib/format";
import { useSettings } from "@/lib/i18n";

const WEEK = 7;

/** The last week of Bangkok dates, newest first, never before launch. */
function recentDays(): string[] {
  const today = new Date(`${dailyDate()}T00:00:00Z`).getTime();
  return Array.from({ length: WEEK }, (_, i) => new Date(today - i * 86400000).toISOString().slice(0, 10)).filter((d) => d >= DAILY_LAUNCH);
}

export default function DailyBoard({ mine }: { mine: string }) {
  const { lang, t } = useSettings();
  const [days] = useState(recentDays);
  const [day, setDay] = useState(days[0]);
  const [data, setData] = useState<{ entries: DayRow[]; lives: number; players: number } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    setOpen(null);
    fetch(`/api/records?day=${day}`)
      .then((r) => r.json())
      .then((res) => alive && res.ok && setData(res))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [day]);

  const label = (d: string, i: number) =>
    i === 0 ? t("daybd.today") : i === 1 ? t("daybd.yesterday") : new Date(`${d}T00:00:00Z`).toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <section className="mt-4 overflow-hidden rounded-xl border-2 border-sky-600/50 bg-gradient-to-b from-sky-950/40 to-night-900">
      <div className="px-4 pt-4 text-center">
        <h2 className="font-pixel text-2xl font-bold text-sky-200">🗓️ {t("daybd.title")}</h2>
        <p className="mt-1 text-xs text-stone-400">{t("daybd.subtitle")}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {days.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              className={`rounded-full px-3 py-1 text-xs ${day === d ? "bg-sky-500 font-semibold text-black" : "border border-sky-800 text-sky-200 hover:bg-sky-900/50"}`}
            >
              {label(d, i)}
            </button>
          ))}
        </div>
        {data && (
          <p className="mt-2 text-[11px] text-stone-500">
            {t("daybd.counts", { players: formatNumber(data.players), lives: formatNumber(data.lives) })}
          </p>
        )}
      </div>

      {data === null ? (
        <p className="p-6 text-center text-sm text-stone-500">…</p>
      ) : data.entries.length === 0 ? (
        <p className="p-6 text-center text-sm text-stone-400">{day === days[0] ? t("daybd.emptyToday") : t("daybd.empty")}</p>
      ) : (
        <ol className="mt-3">
          {data.entries.map((e) => {
            const ending = DATA.ending[e.endingId];
            const city = DATA.city[e.cityId];
            const isMine = Boolean(mine && e.name.toLowerCase() === mine.toLowerCase());
            return (
              <li key={e.id} className={`border-t border-sky-900/40 ${isMine ? "bg-lamp-500/10" : ""}`}>
                <button
                  type="button"
                  onClick={() => setOpen(open === e.id ? null : e.id)}
                  aria-expanded={open === e.id}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-sky-950/30"
                >
                  <span className={`w-8 text-center text-lg font-bold tabular-nums ${e.rank <= 3 ? "" : "text-stone-500"}`}>
                    {e.rank <= 3 ? ["🥇", "🥈", "🥉"][e.rank - 1] : e.rank}
                  </span>
                  <Flag cityId={e.cityId} size={20} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-stone-100">
                      {e.name}
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-normal ${ending?.death ? "bg-red-950/60 text-red-300" : "bg-emerald-950/60 text-emerald-300"}`}>
                        {ending?.death ? t("daybd.died") : t("daybd.escaped")}
                      </span>
                    </div>
                    <div className="truncate text-[11px] text-stone-400">
                      {ending ? `${ending.icon} ${tx(ending, "title", lang)}` : e.endingId} · {city ? tx(city, "name", lang) : e.cityId}
                      {e.lives > 1 && ` · ${t("daybd.lives", { n: formatNumber(e.lives) })}`}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xl font-bold tabular-nums text-sky-200">{formatNumber(e.days)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-stone-500">{t("hall.days")}</div>
                  </div>
                </button>
                {open === e.id && <LifeStoryPanel id={e.id} />}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
