"use client";

// Endings album: every ending found on this device (merged with the server copy), plus a
// recovery code to carry the collection to another device.

import { useEffect, useState } from "react";
import Link from "next/link";
import { DATA } from "@/lib/data";
import { useSettings } from "@/lib/i18n";
import { getRecoveryCode, restoreProfile, syncEndings } from "@/lib/online";
import { loadEndingsFound } from "@/lib/storage";
import { RARITY_STYLE } from "@/lib/ui";
import type { Ending } from "@/types/game";

export default function EndingsPage() {
  const { lang, setLang, t } = useSettings();
  const [found, setFound] = useState<Set<string>>(new Set());
  const [code, setCode] = useState<string | null>(null);
  const [restoreInput, setRestoreInput] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setFound(new Set(loadEndingsFound()));
    syncEndings().then((ids) => setFound(new Set(ids)));
  }, []);

  const showCode = async () => {
    const res = await getRecoveryCode();
    if (res.ok) setCode(res.code);
    else setMessage(t("lb.offline"));
  };

  const restore = async () => {
    setMessage("");
    const res = await restoreProfile(restoreInput);
    if (!res.ok) {
      setMessage(t(res.error === "not_found" || res.error === "bad_request" ? "album.badCode" : "lb.offline"));
      return;
    }
    setFound(new Set(res.endings));
    setCode(null);
    setRestoreInput("");
    setMessage(t("album.restored", { n: res.endings.length }));
  };

  const card = (e: Ending) => {
    const has = found.has(e.id);
    const secret = !has && e.hidden;
    return (
      <li
        key={e.id}
        className={`rounded-xl border p-3 ${has ? "border-night-600 bg-night-800" : "border-dashed border-night-700 bg-night-900/60"}`}
      >
        <div className={`text-3xl ${has ? "" : "opacity-30 grayscale"}`} aria-hidden>
          {secret ? "❔" : e.icon}
        </div>
        <div className={`mt-1 text-sm font-medium leading-snug ${has ? "text-stone-100" : "text-stone-500"}`}>
          {secret ? "???" : lang === "th" ? e.title_th : e.title_en}
        </div>
        <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${has ? RARITY_STYLE[e.rarity] : "bg-night-700 text-stone-500"}`}>
          {t(`rarity.${e.rarity}`)}
        </span>
        {has && <p className="mt-1.5 text-[11px] italic leading-snug text-stone-400">“{lang === "th" ? e.line_th : e.line_en}”</p>}
      </li>
    );
  };

  const escapes = DATA.endings.filter((e) => !e.death);
  const deaths = DATA.endings.filter((e) => e.death);
  const count = (list: Ending[]) => list.filter((e) => found.has(e.id)).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-200">
          ← {t("end.home")}
        </Link>
        <button type="button" onClick={() => setLang(lang === "th" ? "en" : "th")} className="rounded border border-night-600 px-2.5 py-1 text-xs hover:bg-night-800">
          {t("lang.toggle")}
        </button>
      </div>

      <h1 className="lamp-glow text-center font-pixel text-4xl font-bold text-lamp-300">📖 {t("album.title")}</h1>
      <p className="mt-2 text-center text-sm text-stone-400">{t("end.endingsFound", { n: found.size, total: DATA.endings.length })}</p>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-emerald-300">
        🌅 {t("album.escapes")} · {count(escapes)}/{escapes.length}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">{escapes.map(card)}</ul>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-red-300">
        🕯️ {t("album.deaths")} · {count(deaths)}/{deaths.length}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">{deaths.map(card)}</ul>

      <section className="mt-10 rounded-xl border border-night-700 bg-night-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-lamp-300">🔑 {t("album.syncTitle")}</h2>
        <p className="mt-1 text-xs text-stone-400">{t("album.syncHint")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {code ? (
            <span className="rounded-lg bg-night-800 px-4 py-2 font-mono text-xl tracking-[0.2em] text-lamp-300">{code}</span>
          ) : (
            <button type="button" onClick={showCode} className="rounded-lg border border-night-600 bg-night-800 px-4 py-2 text-sm hover:bg-night-700">
              {t("album.showCode")}
            </button>
          )}
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void restore();
          }}
        >
          <input
            value={restoreInput}
            onChange={(e) => setRestoreInput(e.target.value)}
            placeholder="XXXX-XXXX"
            maxLength={9}
            className="min-w-0 flex-1 rounded-lg border border-night-600 bg-night-800 px-3 py-2 font-mono uppercase tracking-widest outline-none focus:border-lamp-500"
          />
          <button type="submit" disabled={restoreInput.replace(/[^a-z0-9]/gi, "").length !== 8} className="rounded-lg bg-lamp-500 px-4 py-2 text-sm font-semibold text-black hover:bg-lamp-400 disabled:opacity-50">
            {t("album.restore")}
          </button>
        </form>
        {message && <p className="mt-2 text-xs text-stone-300">{message}</p>}
      </section>
    </main>
  );
}
