"use client";

// What other players left at this spot: graves, people who got out, and notes. Lives outside the
// engine — nothing here changes the game state. Hidden entirely when the server is offline.

import { useEffect, useState } from "react";
import { DATA } from "@/lib/data";
import { useSettings } from "@/lib/i18n";
import { fetchTraces, leaveNote, lightCandle, type Trace } from "@/lib/online";
import { formatNumber } from "@/lib/format";
import type { GameState } from "@/types/game";

const NOTE_MAX = 80; // keep in step with app/api/traces/route.ts
const SHOWN_CLOSED = 1;

interface Props {
  state: GameState;
  spotId: string;
}

export default function TracesPanel({ state, spotId }: Props) {
  const { lang, t, sfx } = useSettings();
  const [traces, setTraces] = useState<Trace[] | null>(null);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [left, setLeft] = useState(false);

  const cityId = state.cityId;
  useEffect(() => {
    let live = true;
    setLeft(false);
    setError("");
    void fetchTraces(cityId, spotId).then((res) => {
      if (!live) return;
      setTraces(res.ok ? res.traces : null);
      setTotal(res.ok ? res.total : 0);
    });
    return () => {
      live = false;
    };
  }, [cityId, spotId]);

  if (!traces) return null;

  const name = (tr: Trace) => (lang === "th" ? tr.nameTh : tr.nameEn);
  const endingTitle = (id: string | null) => {
    const e = id ? DATA.ending[id] : null;
    return e ? (lang === "th" ? e.title_th : e.title_en) : "";
  };

  const send = async () => {
    if (sending || !text.trim()) return;
    setSending(true);
    setError("");
    const res = await leaveNote(state, spotId, text);
    setSending(false);
    if (!res.ok) {
      const key = `traces.err.${res.error}`;
      setError(["bad_note", "note_blocked", "rate_limited"].includes(res.error) ? t(key) : t("traces.err.other"));
      return;
    }
    sfx("good");
    setTraces((xs) => [
      {
        id: res.id,
        kind: "note",
        nameTh: state.character.name_th,
        nameEn: state.character.name_en,
        age: state.age,
        day: state.day,
        endingId: null,
        body: text.trim(),
        candles: 0,
        lit: false,
        at: Date.now(),
      },
      ...(xs ?? []),
    ]);
    setTotal((n) => n + 1);
    setText("");
    setLeft(true);
    setOpen(true);
  };

  const candle = async (tr: Trace) => {
    if (tr.lit) return;
    setTraces((xs) => xs?.map((x) => (x.id === tr.id ? { ...x, lit: true, candles: x.candles + 1 } : x)) ?? null);
    sfx("click");
    const res = await lightCandle(tr.id);
    if (res.ok) setTraces((xs) => xs?.map((x) => (x.id === tr.id ? { ...x, candles: res.candles } : x)) ?? null);
  };

  const shown = open ? traces : traces.slice(0, SHOWN_CLOSED);

  return (
    <div className="rounded-lg border border-night-700 bg-night-900/80 p-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-xs text-stone-400 hover:text-stone-200">
        <span>
          🕯️ {t("traces.title")} <span className="tabular-nums text-stone-500">({formatNumber(total)})</span>
        </span>
        <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>

      {traces.length === 0 ? (
        <p className="mt-2 text-xs italic text-stone-500">{t("traces.none")}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {shown.map((tr) => (
            <li key={tr.id} className="animate-fadeIn text-xs">
              {tr.kind === "note" ? (
                <div className="text-stone-200">
                  ✍️ “{tr.body}” <span className="text-stone-500">{t("traces.note", { name: name(tr), day: formatNumber(tr.day) })}</span>
                </div>
              ) : tr.kind === "grave" ? (
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-stone-300">
                    🪦 {t("traces.grave", { name: name(tr), age: tr.age, ending: endingTitle(tr.endingId), day: formatNumber(tr.day) })}
                  </span>
                  <button
                    type="button"
                    onClick={() => void candle(tr)}
                    disabled={tr.lit}
                    title={t("traces.candle")}
                    className={`shrink-0 rounded px-1.5 py-0.5 tabular-nums ${tr.lit ? "bg-amber-950/60 text-amber-200" : "border border-night-600 text-stone-400 hover:text-amber-200"}`}
                  >
                    🕯️ {tr.candles > 0 ? formatNumber(tr.candles) : "+"}
                  </button>
                </div>
              ) : (
                <div className="text-emerald-200/90">🌅 {t("traces.free", { name: name(tr), ending: endingTitle(tr.endingId) })}</div>
              )}
            </li>
          ))}
          {!open && traces.length > SHOWN_CLOSED && (
            <li className="text-[11px] text-stone-500">{t("traces.more", { n: formatNumber(total - SHOWN_CLOSED) })}</li>
          )}
        </ul>
      )}

      {open &&
        (left ? (
          <p className="mt-2 text-[11px] text-emerald-300">{t("traces.left")}</p>
        ) : (
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={NOTE_MAX}
              placeholder={t("traces.write")}
              className="min-w-0 flex-1 rounded border border-night-600 bg-night-950 px-2 py-1 text-xs outline-none focus:border-lamp-500"
            />
            <button type="submit" disabled={sending || !text.trim()} className="rounded bg-lamp-500 px-3 py-1 text-xs font-semibold text-black disabled:opacity-50">
              {t("traces.leave")}
            </button>
          </form>
        ))}
      {error && <p className="mt-1 text-[11px] text-rose-300">{error}</p>}
    </div>
  );
}
