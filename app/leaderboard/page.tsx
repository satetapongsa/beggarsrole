"use client";

// One page for everything players have done since launch: totals, all-time records, and every
// finished life (named or not) sortable by score, days survived or money at the end.

import { useEffect, useState } from "react";
import Link from "next/link";
import DailyBoard from "@/components/DailyBoard";
import Flag from "@/components/Flag";
import LifeStoryPanel from "@/components/LifeStoryPanel";
import type { LifeEntry, PlayerRow, Records, SurvivorRow } from "@/app/api/records/route";
import { DATA } from "@/lib/data";
import { formatMoney, formatNumber } from "@/lib/format";
import { useSettings } from "@/lib/i18n";
import { loadNickname } from "@/lib/storage";

type Sort = "score" | "days" | "money";

// the page is split into tabs so nobody has to scroll past everything to find one board
type Tab = "overview" | "hall" | "daily" | "players" | "lives";
const TABS: { id: Tab; icon: string }[] = [
  { id: "overview", icon: "📊" },
  { id: "hall", icon: "🏛️" },
  { id: "daily", icon: "🗓️" },
  { id: "players", icon: "👥" },
  { id: "lives", icon: "📜" },
];

/** Honour medals by how many days the surviving life lasted, highest first. */
const MEDALS = [
  { min: 365, icon: "💎", key: "diamond", cls: "border-cyan-400/60 bg-cyan-900/30 text-cyan-200" },
  { min: 180, icon: "🥇", key: "gold", cls: "border-amber-400/60 bg-amber-900/30 text-amber-200" },
  { min: 60, icon: "🥈", key: "silver", cls: "border-stone-300/50 bg-stone-700/30 text-stone-200" },
  { min: 0, icon: "🥉", key: "bronze", cls: "border-orange-700/60 bg-orange-950/40 text-orange-200" },
] as const;
const medalFor = (days: number) => MEDALS.find((m) => days >= m.min)!;
/** Rows a long list shows before "show more". */
const PAGE = 25;
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
  const [players, setPlayers] = useState<PlayerRow[] | null>(null);
  const [survivors, setSurvivors] = useState<SurvivorRow[] | null>(null);
  const [allPlayers, setAllPlayers] = useState(false);
  // a player picked from the players list: the lives list shows only their lives
  const [who, setWho] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [livesShown, setLivesShown] = useState(PAGE);
  const [hallShown, setHallShown] = useState(PAGE);
  // life stories opened from the record cards and from the survivors' hall (the champion's opens by itself)
  const [cardStory, setCardStory] = useState<string | null>(null);
  const [hallStory, setHallStory] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("sort") as Sort | null;
    if (s && SORTS.includes(s)) setSort(s);
    const tb = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (tb && TABS.some((x) => x.id === tb)) setTab(tb);
    setMine(loadNickname());
    fetch("/api/stats")
      .then((r) => r.json())
      .then((s) => (s.ok ? setStats(s) : setOffline(true)))
      .catch(() => setOffline(true));
  }, []);

  useEffect(() => {
    let alive = true;
    setEntries(null);
    setLivesShown(PAGE);
    setOpen(null);
    const q = new URLSearchParams({ sort, ...(who ? { name: who } : {}) });
    fetch(`/api/records?${q}`)
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        if (!res.ok) return setOffline(true);
        setEntries(res.entries);
        setRecords(res.records);
        setPlayers(res.players);
        setSurvivors(res.survivors);
        setHallStory((cur) => (cur === undefined ? res.survivors?.[0]?.id ?? null : cur));
      })
      .catch(() => alive && setOffline(true));
    return () => {
      alive = false;
    };
  }, [sort, who]);

  // switching tabs keeps the address shareable (?tab=daily) without reloading the page
  const openTab = (next: Tab) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  };

  const pickPlayer = (name: string) => {
    setWho(who === name ? null : name);
    openTab("lives");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cityName = (id: string) => {
    const c = DATA.city[id];
    return c ? (lang === "th" ? c.name_th : c.name_en) : id;
  };
  const endingName = (id: string) => {
    const e = DATA.ending[id];
    return e ? `${e.icon} ${lang === "th" ? e.title_th : e.title_en}` : id;
  };
  const playerName = (e: LifeEntry) => e.name ?? t("rec.anon");
  const isMine = (n: string | null) => Boolean(mine && n && n.toLowerCase() === mine.toLowerCase());
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
          <nav className="sticky top-0 z-20 -mx-4 mt-5 border-b border-night-700 bg-night-950/90 px-4 py-2 backdrop-blur" aria-label={t("tabs.label")}>
            <div className="flex gap-1.5 overflow-x-auto">
              {TABS.map((tb) => (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => openTab(tb.id)}
                  aria-current={tab === tb.id ? "page" : undefined}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${tab === tb.id ? "bg-lamp-500 font-semibold text-black" : "border border-night-600 text-stone-300 hover:bg-night-800"}`}
                >
                  {tb.icon} {t(`tabs.${tb.id}`)}
                </button>
              ))}
            </div>
          </nav>
          {tab === "overview" && (
            <>
          {stats && (
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                <button
                  type="button"
                  key={label}
                  disabled={!e}
                  onClick={() => e && setCardStory(cardStory === e.id ? null : e.id)}
                  aria-expanded={Boolean(e && cardStory === e.id)}
                  className={`rounded-xl border bg-night-900 p-4 text-left hover:bg-night-800 ${e && cardStory === e.id ? "border-lamp-400" : "border-lamp-500/30"}`}
                >
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
                  {e && <div className="mt-2 text-[11px] text-lamp-300/80">{cardStory === e.id ? t("story.hide") : t("story.show")}</div>}
                </button>
              ))}
            </section>
          )}
          {cardStory && (
            <section className="mt-3 rounded-xl border border-lamp-500/40 bg-night-900 pt-4">
              <LifeStoryPanel id={cardStory} />
            </section>
          )}
            </>
          )}

          {tab === "hall" && (
            <>
          {survivors && (
            <section className="mt-4 overflow-hidden rounded-xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-950/40 to-night-900 shadow-lg shadow-amber-900/20">
              <div className="px-4 pt-4 text-center">
                <h2 className="font-pixel text-2xl font-bold text-amber-300">🏛️ {t("hall.title")}</h2>
                <p className="mt-1 text-xs text-stone-400">{t("hall.subtitle")}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[11px]">
                  {MEDALS.map((m) => (
                    <span key={m.key} className={`rounded-full border px-2 py-0.5 ${m.cls}`}>
                      {m.icon} {t(`hall.medal.${m.key}`)} · {m.min > 0 ? t("hall.medalMin", { days: m.min }) : t("hall.medalAny")}
                    </span>
                  ))}
                </div>
              </div>
              {survivors.length === 0 ? (
                <p className="p-6 text-center text-sm text-stone-400">{t("hall.empty")}</p>
              ) : (
                <ol className="mt-3">
                  {survivors.slice(0, hallShown).map((sv) => {
                    const m = medalFor(sv.days);
                    return (
                      <li key={sv.name} className={`border-t border-amber-900/40 ${isMine(sv.name) ? "bg-lamp-500/10" : ""}`}>
                        <button
                          type="button"
                          onClick={() => setHallStory(hallStory === sv.id ? null : sv.id)}
                          aria-expanded={hallStory === sv.id}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-amber-950/30"
                        >
                        <span className={`w-8 text-center text-lg font-bold tabular-nums ${sv.rank <= 3 ? "text-amber-300" : "text-stone-500"}`}>
                          {sv.rank === 1 ? "👑" : sv.rank}
                        </span>
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xl ${m.cls}`} title={t(`hall.medal.${m.key}`)}>
                          {m.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-stone-100">{sv.name}</div>
                          <div className="truncate text-[11px] text-stone-400">
                            {endingName(sv.endingId)} · {cityName(sv.cityId)} · {t("rec.d.age", { age: sv.age })}
                            {sv.survived > 1 && ` · ${t("hall.times", { n: formatNumber(sv.survived) })}`}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-2xl font-bold tabular-nums text-amber-300">{formatNumber(sv.days)}</div>
                          <div className="text-[10px] uppercase tracking-wider text-stone-500">{t("hall.days")}</div>
                        </div>
                        </button>
                        {hallStory === sv.id && (
                          <>
                            <LifeStoryPanel id={sv.id} />
                            <button type="button" onClick={() => pickPlayer(sv.name)} className="mb-3 ml-4 text-xs text-sky-300 hover:text-sky-200">
                              {t("story.allLives", { name: sv.name })} →
                            </button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
              {survivors.length > hallShown && (
                <button type="button" onClick={() => setHallShown((n) => n + PAGE)} className="w-full border-t border-amber-900/40 py-2.5 text-sm text-amber-200 hover:bg-amber-950/30">
                  {t("more.show", { n: formatNumber(survivors.length - hallShown) })}
                </button>
              )}
            </section>
          )}
            </>
          )}

          {tab === "daily" && (
            <>
          <DailyBoard mine={mine} />
            </>
          )}

          {tab === "players" && (
            <>
          {players && players.length > 0 && (
            <section className="mt-6 overflow-hidden rounded-xl border border-night-700 bg-night-900">
              <h2 className="px-4 pt-4 text-sm font-semibold uppercase tracking-wider text-lamp-300">
                👥 {t("rec.players", { n: formatNumber(players.length) })}
              </h2>
              <p className="px-4 pb-2 text-[11px] text-stone-500">{t("rec.playersHint")}</p>
              <ol>
                {(allPlayers ? players : players.slice(0, 20)).map((p, i) => (
                  <li key={p.name} className={`border-t border-night-800 ${isMine(p.name) ? "bg-lamp-500/10" : ""} ${p.name === who ? "bg-sky-900/30" : ""}`}>
                    <button type="button" onClick={() => pickPlayer(p.name)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-night-800/60">
                      <span className="w-7 text-right font-semibold tabular-nums text-stone-500">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-stone-100">{p.name}</div>
                        <div className="truncate text-[11px] text-stone-500">
                          {t("rec.p.reborn", { n: formatNumber(p.starts) })} · {t("rec.p.ended", { n: formatNumber(p.ended) })}
                          {p.escaped > 0 && ` · ${t("rec.p.escaped", { n: formatNumber(p.escaped) })}`}
                          {p.longest !== null && ` · ${t("rec.p.longest", { days: formatNumber(p.longest) })}`}
                          {p.richestThb !== null && ` · ${t("rec.p.richest", { thb: formatNumber(p.richestThb) })}`}
                        </div>
                      </div>
                      <span className="font-semibold tabular-nums text-lamp-300">{p.best === null ? "—" : formatNumber(p.best)}</span>
                    </button>
                  </li>
                ))}
              </ol>
              {players.length > 20 && (
                <button type="button" onClick={() => setAllPlayers((v) => !v)} className="w-full border-t border-night-800 py-2 text-xs text-stone-400 hover:bg-night-800">
                  {allPlayers ? t("rec.showLess") : t("rec.showAll", { n: formatNumber(players.length) })}
                </button>
              )}
            </section>
          )}
            </>
          )}

          {tab === "lives" && (
            <>
          <div id="lives" className="mt-4 flex flex-wrap items-center gap-2">
            {who && (
              <button type="button" onClick={() => setWho(null)} className="rounded-full bg-sky-800 px-4 py-1.5 text-sm text-sky-100 hover:bg-sky-700">
                {t("rec.livesOf", { name: who })} ✕
              </button>
            )}
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
                {entries.slice(0, livesShown).map((e) => {
                  const isOpen = open === e.rank;
                  const origin = e.originId ? DATA.origin[e.originId] : null;
                  const charName = lang === "th" ? e.charTh : e.charEn;
                  return (
                    <li key={`${e.rank}-${e.at}`} className={`border-b border-night-800 last:border-0 ${isMine(e.name) ? "bg-lamp-500/10" : ""}`}>
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
                      {isOpen && <LifeStoryPanel id={e.id} />}
                    </li>
                  );
                })}
              </ol>
            )}
            {entries && entries.length > livesShown && (
              <button type="button" onClick={() => setLivesShown((n) => n + PAGE)} className="w-full border-t border-night-800 py-2.5 text-sm text-stone-300 hover:bg-night-800">
                {t("more.show", { n: formatNumber(entries.length - livesShown) })}
              </button>
            )}
          </section>
          <p className="mt-2 text-center text-[11px] text-stone-500">{t("rec.note")}</p>
            </>
          )}

          {tab === "overview" && (
            <>
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
        </>
      )}
    </main>
  );
}
