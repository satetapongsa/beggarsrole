"use client";

// One page for everything players have done since launch: totals, all-time records, and every
// finished life (named or not) sortable by score, days survived or money at the end.

import { useEffect, useState } from "react";
import Link from "next/link";
import Flag from "@/components/Flag";
import type { LifeEntry, Records } from "@/app/api/records/route";
import { DATA } from "@/lib/data";
import { formatMoney, formatNumber } from "@/lib/format";
import { useSettings } from "@/lib/i18n";
import { loadNickname } from "@/lib/storage";

type Sort = "score" | "days" | "money";
const SORTS: Sort[] = ["score", "days", "money"];

interface Stats {
  players: number;
  started: number;
  ended: number;
  today: { players: number; started: number };
  endings: { id: string; n: number }[];
}

export default function LeaderboardPage() {
  const { lang, setLang, t } = useSettings();
  const [sort, setSort] = useState<Sort>("score");
  const [entries, setEntries] = useState<LifeEntry[] | null>(null);
  const [records, setRecords] = useState<Records | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [offline, setOffline] = useState(false);
  const [mine, setMine] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("sort") as Sort | null;
    if (s && SORTS.includes(s)) setSort(s);
    setMine(loadNickname());
    fetch("/api/stats")
      .then((r) => r.json())
      .then((s) => (s.ok ? setStats(s) : setOffline(true)))
      .catch(() => setOffline(true));
  }, []);

  useEffect(() => {
    let alive = true;
    setEntries(null);
    setOpen(null);
    fetch(`/api/records?sort=${sort}`)
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        if (!res.ok) return setOffline(true);
        setEntries(res.entries);
        setRecords(res.records);
      })
      .catch(() => alive && setOffline(true));
    return () => {
      alive = false;
    };
  }, [sort]);

  const cityName = (id: string) => {
    const c = DATA.city[id];
    return c ? (lang === "th" ? c.name_th : c.name_en) : id;
  };
  const endingName = (id: string) => {
    const e = DATA.ending[id];
    return e ? `${e.icon} ${lang === "th" ? e.title_th : e.title_en}` : id;
  };
  const playerName = (e: LifeEntry) => e.name ?? t("rec.anon");
  const money = (e: LifeEntry) => {
    const city = DATA.city[e.endCityId ?? ""];
    if (e.money === null || !city) return "—";
    const local = formatMoney(e.money, city);
    return city.currency.code === "THB" || e.moneyThb === null ? local : `${local} (≈฿${formatNumber(e.moneyThb)})`;
  };
  const metric = (e: LifeEntry) =>
    sort === "days"
      ? t("lb.days", { days: formatNumber(e.days) })
      : sort === "money"
        ? e.moneyThb === null
          ? "—"
          : `฿${formatNumber(e.moneyThb)}`
        : formatNumber(e.score);

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
      <p className="mt-1 text-center text-sm text-stone-400">{t("rec.subtitle")}</p>

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
                  ...(records
                    ? ([
                        ["📆", t("rec.totalDays"), records.totalDays],
                        ["⏳", t("rec.avgDays"), records.avgDays],
                        ["🚪", t("rec.escaped"), records.escaped],
                        ["🪦", t("rec.died"), Math.max(0, stats.ended - records.escaped)],
                      ] as const)
                    : []),
                ] as const
              ).map(([icon, label, value]) => (
                <div key={label} className="rounded-lg bg-night-800 p-3 text-center">
                  <dt className="text-[11px] text-stone-400">
                    {icon} {label}
                  </dt>
                  <dd className="text-lg font-medium tabular-nums text-stone-100">{formatNumber(value)}</dd>
                </div>
              ))}
            </dl>
          )}

          {records && (
            <section className="mt-6 grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["⏳", t("rec.longest"), records.longest, (e: LifeEntry) => t("lb.days", { days: formatNumber(e.days) })],
                  ["💰", t("rec.richest"), records.richest, (e: LifeEntry) => money(e)],
                  ["🏆", t("rec.best"), records.best, (e: LifeEntry) => `${formatNumber(e.score)} ${t("rec.points")}`],
                ] as const
              ).map(([icon, label, e, value]) => (
                <div key={label} className="rounded-xl border border-lamp-500/30 bg-night-900 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-lamp-300">
                    {icon} {label}
                  </div>
                  {e ? (
                    <>
                      <div className="mt-1 truncate text-lg font-semibold text-stone-100">{playerName(e)}</div>
                      <div className="text-sm text-lamp-300">{value(e)}</div>
                      <div className="mt-1 truncate text-[11px] text-stone-500">
                        {endingName(e.endingId)} · {cityName(e.cityId)}
                      </div>
                    </>
                  ) : (
                    <div className="mt-1 text-sm text-stone-500">—</div>
                  )}
                </div>
              ))}
            </section>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {SORTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={`rounded-full px-4 py-1.5 text-sm ${sort === s ? "bg-lamp-500 font-semibold text-black" : "border border-night-600 text-stone-300 hover:bg-night-800"}`}
              >
                {t(`rec.sort.${s}`)}
              </button>
            ))}
          </div>

          <section className="mt-4 overflow-hidden rounded-xl border border-night-700 bg-night-900">
            {entries === null ? (
              <p className="p-6 text-center text-sm text-stone-500">…</p>
            ) : entries.length === 0 ? (
              <p className="p-6 text-center text-sm text-stone-400">{t("lb.empty")}</p>
            ) : (
              <ol>
                {entries.map((e) => {
                  const isOpen = open === e.rank;
                  const origin = e.originId ? DATA.origin[e.originId] : null;
                  const charName = lang === "th" ? e.charTh : e.charEn;
                  return (
                    <li key={`${e.rank}-${e.at}`} className={`border-b border-night-800 last:border-0 ${mine && e.name === mine ? "bg-lamp-500/10" : ""}`}>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : e.rank)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-night-800/60"
                      >
                        <span className={`w-7 text-right font-semibold tabular-nums ${e.rank <= 3 ? "text-lamp-300" : "text-stone-500"}`}>
                          {e.rank <= 3 ? ["🥇", "🥈", "🥉"][e.rank - 1] : e.rank}
                        </span>
                        <Flag cityId={e.cityId} size={20} />
                        <div className="min-w-0 flex-1">
                          <div className={`truncate font-medium ${e.name ? "text-stone-100" : "italic text-stone-400"}`}>{playerName(e)}</div>
                          <div className="truncate text-[11px] text-stone-500">
                            {endingName(e.endingId)} · {t("lb.days", { days: formatNumber(e.days) })}
                          </div>
                        </div>
                        <span className="font-semibold tabular-nums text-lamp-300">{metric(e)}</span>
                      </button>
                      {isOpen && (
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-4 pb-3 pl-14 text-xs">
                          {(
                            [
                              [t("rec.d.character"), charName ? `${charName}${origin ? ` — ${lang === "th" ? origin.name_th : origin.name_en}` : ""}` : "—"],
                              [t("rec.d.born"), cityName(e.cityId)],
                              [t("rec.d.endedIn"), e.endCityId ? cityName(e.endCityId) : "—"],
                              [t("rec.d.survived"), `${t("lb.days", { days: formatNumber(e.days) })} · ${t("rec.d.age", { age: e.age })}`],
                              [t("rec.d.money"), money(e)],
                              [t("rec.d.cities"), e.cities === null ? "—" : formatNumber(e.cities)],
                              [t("rec.d.ending"), endingName(e.endingId)],
                              [t("rec.d.score"), formatNumber(e.score)],
                              [t("rec.d.when"), `${new Date(e.at).toLocaleDateString(lang === "th" ? "th-TH" : "en-GB")}${e.daily ? ` · 📅 ${t("rec.d.daily")}` : ""}`],
                            ] as const
                          ).map(([k, v]) => (
                            <div key={k} className="contents">
                              <dt className="text-stone-500">{k}</dt>
                              <dd className="text-stone-200">{v}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
          <p className="mt-2 text-center text-[11px] text-stone-500">{t("rec.note")}</p>

          {stats && stats.endings.length > 0 && (
            <section className="mt-6 rounded-xl border border-night-700 bg-night-900 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-lamp-300">{t("lb.commonEndings")}</h2>
              <ul className="space-y-1.5 text-sm">
                {stats.endings.slice(0, 8).map(({ id, n }) => (
                  <li key={id} className="flex justify-between gap-3 text-stone-300">
                    <span className="truncate">{endingName(id)}</span>
                    <span className="tabular-nums text-stone-500">{Math.round((n / Math.max(1, stats.ended)) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-6 text-center text-[11px] leading-relaxed text-stone-500">{t("lb.howScore")}</p>
        </>
      )}
    </main>
  );
}
