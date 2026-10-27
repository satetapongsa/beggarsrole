"use client";

// End-screen leaderboard panel: sends the finished life to the server for verification, shows the
// server-computed score, and lets the player put it on the board under a nickname.

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatNumber } from "@/lib/format";
import { useSettings } from "@/lib/i18n";
import { claimRun, submitRun } from "@/lib/online";
import type { ScoreBreakdown } from "@/lib/score";
import { loadLastRun, loadNickname, saveLastRun, saveNickname, type LastRun } from "@/lib/storage";
import type { GameState } from "@/types/game";

type Status = "sending" | "ready" | "claiming" | "claimed" | "offline" | "invalid";

export default function RunPanel({ life }: { life: GameState }) {
  const { t } = useSettings();
  const [status, setStatus] = useState<Status>("sending");
  const [run, setRun] = useState<LastRun | null>(null);
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(loadNickname());
    const endingDay = life.ended?.day ?? 0;
    const saved = loadLastRun();
    if (saved && saved.seed === life.seed && saved.endingDay === endingDay && saved.runId) {
      setRun(saved);
      setStatus(saved.name ? "claimed" : "ready");
    }
    // always (re)submit: it's idempotent on the server and returns the full score breakdown
    let alive = true;
    submitRun(life).then((res) => {
      if (!alive) return;
      if (!res.ok) {
        if (!saved?.runId) setStatus(res.error === "invalid_run" ? "invalid" : "offline");
        return;
      }
      const next: LastRun = { ...(saved?.runId === res.runId ? saved : {}), seed: life.seed, endingDay, runId: res.runId, score: res.score.total, rank: saved?.name ? saved.rank : res.rank };
      saveLastRun(next);
      setRun(next);
      setScore(res.score);
      setStatus(next.name ? "claimed" : "ready");
    });
    return () => {
      alive = false;
    };
  }, [life]);

  const claim = async () => {
    if (!run?.runId || !name.trim()) return;
    setStatus("claiming");
    setError("");
    const res = await claimRun(run.runId, name);
    if (!res.ok && res.error !== "already_claimed") {
      setStatus("ready");
      setError(t(`lb.error.${res.error === "bad_request" ? "name" : "generic"}`));
      return;
    }
    saveNickname(name.trim());
    const next = { ...run, name: name.trim(), rank: res.ok ? res.rank ?? run.rank : run.rank };
    saveLastRun(next);
    setRun(next);
    setStatus("claimed");
  };

  if (status === "offline" || status === "invalid") {
    return (
      <section className="mt-6 rounded-xl border border-night-700 bg-night-900 p-5 text-center text-sm text-stone-400">
        {t(status === "offline" ? "lb.offline" : "lb.invalid")}
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-xl border border-lamp-500/40 bg-night-900 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-lamp-300">🏆 {t("lb.score")}</h2>
        <Link href="/leaderboard" className="text-xs text-stone-400 hover:text-stone-200">
          {t("lb.view")} →
        </Link>
      </div>
      {status === "sending" ? (
        <p className="mt-3 text-sm text-stone-400">{t("lb.sending")}</p>
      ) : (
        <>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-4xl font-bold tabular-nums text-lamp-300">{formatNumber(run?.score ?? 0)}</span>
            {run?.rank && <span className="text-sm text-stone-400">{t("lb.rank", { rank: formatNumber(run.rank) })}</span>}
          </div>
          {score && (
            <p className="mt-1 text-xs text-stone-500">
              {t("lb.breakdown", {
                survival: formatNumber(score.survival),
                escape: formatNumber(score.escape),
                speed: formatNumber(score.speed),
                kindness: formatNumber(score.kindness),
                mult: score.mult,
              })}
            </p>
          )}
          {status === "claimed" ? (
            <p className="mt-3 text-sm text-emerald-300">✓ {t("lb.claimed", { name: run?.name ?? "" })}</p>
          ) : (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void claim();
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder={t("lb.namePlaceholder")}
                className="min-w-0 flex-1 rounded-lg border border-night-600 bg-night-800 px-3 py-2 text-sm outline-none focus:border-lamp-500"
              />
              <button
                type="submit"
                disabled={status === "claiming" || !name.trim()}
                className="rounded-lg bg-lamp-500 px-4 py-2 text-sm font-semibold text-black hover:bg-lamp-400 disabled:opacity-50"
              >
                {t("lb.submit")}
              </button>
            </form>
          )}
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </>
      )}
    </section>
  );
}
