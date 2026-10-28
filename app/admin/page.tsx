"use client";

// Admin dashboard: play stats over the last 30 days, how long lives last, and leaderboard
// moderation. The token is checked server-side (ADMIN_TOKEN); it is only kept in sessionStorage.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DATA } from "@/lib/data";
import { formatNumber } from "@/lib/format";

// validated single-series colors on the night surface (dataviz validator, dark mode)
const PLAYERS_COLOR = "#d97706";
const LENGTH_COLOR = "#0284c7";
const TOKEN_KEY = "spare-change:admin-token";

interface Day {
  day: string;
  players: number;
  started: number;
  ended: number;
  newPlayers: number;
}
interface Recent {
  id: string;
  name: string;
  score: number;
  endingId: string;
  cityId: string;
  hidden: boolean;
  claimedAt: string;
}
interface Note {
  id: number;
  body: string;
  cityId: string;
  nameEn: string;
  hidden: boolean;
  createdAt: string;
}
interface Feedback {
  id: number;
  kind: "bug" | "idea" | "other";
  body: string;
  contact: string | null;
  page: string;
  lang: string;
  cityId: string | null;
  day: number | null;
  seed: string | null;
  userAgent: string | null;
  resolved: boolean;
  createdAt: string;
}
const KIND_STYLE: Record<Feedback["kind"], string> = {
  bug: "bg-red-900/60 text-red-200",
  idea: "bg-sky-900/60 text-sky-200",
  other: "bg-night-700 text-stone-300",
};
interface Dashboard {
  totals: { players: number; started: number; ended: number; claimed: number; daily: number };
  series: Day[];
  lengths: { bucket: string; n: number }[];
  recent: Recent[];
  notes: Note[];
  feedback: Feedback[];
}

/** Single-series vertical bars with a hover tooltip; labels only the peak and the latest bar. */
function Bars({ title, data, color, unit }: { title: string; data: { label: string; value: number; detail?: string }[]; color: string; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const H = 140;
  return (
    <section className="rounded-xl border border-night-700 bg-night-900 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-stone-200">{title}</h2>
        <button type="button" onClick={() => setTable((v) => !v)} className="text-xs text-stone-400 hover:text-stone-200">
          {table ? "chart" : "table"}
        </button>
      </div>
      {table ? (
        <table className="w-full text-left text-xs text-stone-300">
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b border-night-800">
                <td className="py-1 text-stone-400">{d.label}</td>
                <td className="py-1 text-right tabular-nums">{formatNumber(d.value)}</td>
                {d.detail !== undefined && <td className="py-1 pl-4 text-stone-500">{d.detail}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          <div className="flex items-end gap-[2px] border-b border-night-600" style={{ height: H }} onPointerLeave={() => setHover(null)}>
            {data.map((d, i) => {
              const h = d.value === 0 ? 0 : Math.max(3, (d.value / max) * (H - 18));
              const label = i === peak || i === data.length - 1;
              return (
                <div
                  key={d.label}
                  className="relative flex h-full flex-1 cursor-default flex-col items-center justify-end"
                  onPointerEnter={() => setHover(i)}
                  tabIndex={0}
                  onFocus={() => setHover(i)}
                  aria-label={`${d.label}: ${d.value} ${unit}`}
                >
                  {label && d.value > 0 && <span className="mb-0.5 text-[10px] tabular-nums text-stone-300">{formatNumber(d.value)}</span>}
                  <div
                    className="w-full rounded-t-[4px] transition-opacity"
                    style={{ height: h, background: color, opacity: hover === null || hover === i ? 1 : 0.55 }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-stone-500">
            <span>{data[0]?.label}</span>
            <span>{data[data.length - 1]?.label}</span>
          </div>
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border border-night-600 bg-night-950 px-2 py-1 text-xs shadow-lg"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
            >
              <div className="font-semibold tabular-nums text-stone-100">
                {formatNumber(data[hover].value)} <span className="font-normal text-stone-400">{unit}</span>
              </div>
              <div className="text-stone-400">{data[hover].label}</div>
              {data[hover].detail && <div className="text-stone-500">{data[hover].detail}</div>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (tok: string) => {
    setError("");
    try {
      const res = await fetch("/api/admin", { headers: { authorization: `Bearer ${tok}` } });
      const body = await res.json();
      if (!body.ok) {
        setError(body.error === "unauthorized" ? "Wrong token" : `Error: ${body.error}`);
        if (body.error === "unauthorized") sessionStorage.removeItem(TOKEN_KEY);
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, tok);
      setToken(tok);
      setData(body);
    } catch {
      setError("Network error");
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) void load(saved);
  }, [load]);

  const toggle = async (r: Recent) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: r.hidden ? "unhide" : "hide", runId: r.id }),
    });
    await load(token);
  };

  const toggleNote = async (n: Note) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: n.hidden ? "unhideNote" : "hideNote", traceId: n.id }),
    });
    await load(token);
  };

  const toggleFeedback = async (f: Feedback) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: f.resolved ? "reopen" : "resolve", feedbackId: f.id }),
    });
    await load(token);
  };

  if (!data) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
        <h1 className="mb-4 text-center font-pixel text-3xl text-lamp-300">Admin</h1>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void load(input);
          }}
        >
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ADMIN_TOKEN"
            className="min-w-0 flex-1 rounded-lg border border-night-600 bg-night-900 px-3 py-2 text-sm outline-none focus:border-lamp-500"
          />
          <button type="submit" className="rounded-lg bg-lamp-500 px-4 py-2 text-sm font-semibold text-black">
            Enter
          </button>
        </form>
        {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}
      </main>
    );
  }

  const { totals, series, lengths, recent, notes, feedback } = data;
  const open = feedback.filter((f) => !f.resolved).length;
  const today = series[series.length - 1];
  const tiles: [string, number][] = [
    ["Players (all time)", totals.players],
    ["Players today", today?.players ?? 0],
    ["New today", today?.newPlayers ?? 0],
    ["Lives started", totals.started],
    ["Lives finished", totals.ended],
    ["On leaderboard", totals.claimed],
  ];
  const finishRate = totals.started ? Math.round((totals.ended / totals.started) * 100) : 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-pixel text-3xl text-lamp-300">Admin</h1>
        <div className="flex gap-3 text-sm">
          <button type="button" onClick={() => void load(token)} className="text-stone-400 hover:text-stone-200">
            ↻ Refresh
          </button>
          <Link href="/" className="text-stone-400 hover:text-stone-200">
            Game →
          </Link>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-night-800 p-3">
            <dt className="text-[11px] text-stone-400">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums text-stone-100">{formatNumber(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-stone-500">
        {finishRate}% of started lives reach an ending · {formatNumber(totals.daily)} daily-challenge runs
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Bars
          title="Players per day (last 30 days, Bangkok time)"
          unit="players"
          color={PLAYERS_COLOR}
          data={series.map((d) => ({
            label: d.day.slice(5),
            value: d.players,
            detail: `${d.newPlayers} new · ${d.started} started · ${d.ended} finished`,
          }))}
        />
        <Bars
          title="How long lives last (days survived)"
          unit="lives"
          color={LENGTH_COLOR}
          data={lengths.map((l) => ({ label: l.bucket, value: l.n }))}
        />
      </div>

      <section className="mt-6 rounded-xl border border-night-700 bg-night-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-stone-200">
          Player feedback <span className="font-normal text-stone-500">· {open} open</span>
        </h2>
        {feedback.length === 0 ? (
          <p className="text-sm text-stone-500">No feedback yet.</p>
        ) : (
          <ul className="divide-y divide-night-800">
            {feedback.map((f) => (
              <li key={f.id} className={`flex items-start gap-3 py-2.5 text-sm ${f.resolved ? "opacity-50" : ""}`}>
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase ${KIND_STYLE[f.kind] ?? KIND_STYLE.other}`}>{f.kind}</span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap break-words text-stone-100">{f.body}</p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {new Date(f.createdAt).toLocaleString()} · {f.page} · {f.lang}
                    {f.cityId && ` · ${DATA.city[f.cityId]?.flag ?? ""} ${f.cityId} day ${f.day} seed #${f.seed}`}
                    {f.contact && <span className="text-stone-300"> · contact: {f.contact}</span>}
                  </p>
                  {f.userAgent && <p className="truncate text-[10px] text-stone-600">{f.userAgent}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => void toggleFeedback(f)}
                  className={`shrink-0 rounded px-2 py-0.5 text-xs ${f.resolved ? "border border-night-600 text-stone-300" : "bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800"}`}
                >
                  {f.resolved ? "Reopen" : "Done"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-night-700 bg-night-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-stone-200">Latest leaderboard names</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-stone-500">No names yet.</p>
        ) : (
          <ul className="divide-y divide-night-800">
            {recent.map((r) => (
              <li key={r.id} className={`flex items-center gap-3 py-2 text-sm ${r.hidden ? "opacity-50" : ""}`}>
                <span className="w-6 text-center">{DATA.city[r.cityId]?.flag}</span>
                <span className="min-w-0 flex-1 truncate">
                  <span className={r.hidden ? "line-through" : "text-stone-100"}>{r.name}</span>
                  <span className="ml-2 text-xs text-stone-500">
                    {DATA.ending[r.endingId]?.icon} {new Date(r.claimedAt).toLocaleString()}
                  </span>
                </span>
                <span className="tabular-nums text-stone-300">{formatNumber(r.score)}</span>
                <button
                  type="button"
                  onClick={() => void toggle(r)}
                  className={`rounded px-2 py-0.5 text-xs ${r.hidden ? "border border-night-600 text-stone-300" : "bg-red-900/60 text-red-200 hover:bg-red-800"}`}
                >
                  {r.hidden ? "Restore" : "Hide"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-night-700 bg-night-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-stone-200">Latest street notes</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-stone-500">No notes yet.</p>
        ) : (
          <ul className="divide-y divide-night-800">
            {notes.map((n) => (
              <li key={n.id} className={`flex items-center gap-3 py-2 text-sm ${n.hidden ? "opacity-50" : ""}`}>
                <span className="w-6 text-center">{DATA.city[n.cityId]?.flag}</span>
                <span className="min-w-0 flex-1">
                  <span className={n.hidden ? "line-through" : "text-stone-100"}>{n.body}</span>
                  <span className="ml-2 text-xs text-stone-500">
                    {n.nameEn} · {new Date(n.createdAt).toLocaleString()}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void toggleNote(n)}
                  className={`rounded px-2 py-0.5 text-xs ${n.hidden ? "border border-night-600 text-stone-300" : "bg-red-900/60 text-red-200 hover:bg-red-800"}`}
                >
                  {n.hidden ? "Restore" : "Hide"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
