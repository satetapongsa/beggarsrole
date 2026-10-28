"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/i18n";
import { isHelpKey, STAT_ICON } from "@/lib/ui";
import { STAT_KEYS } from "@/types/game";

const SHORTCUTS: [string, string][] = [
  ["1–9", "help.key.card"],
  ["← →", "help.key.tab"],
  ["Q W E R", "help.key.tabDirect"],
  ["1–9", "help.key.choice"],
  ["Enter", "help.key.continue"],
  ["Esc", "help.key.close"],
  ["?", "help.key.help"],
];

export default function HelpModal({ onClose }: { onClose: () => void }) {
  const { t } = useSettings();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || isHelpKey(e)) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t("help.title")} onClick={onClose}>
      <div
        className="scrollbar-thin max-h-[85dvh] w-full max-w-lg animate-slideUp overflow-y-auto rounded-t-2xl border border-night-600 bg-night-900 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-semibold text-lamp-300">{t("help.title")}</h2>

        <section className="mb-4 space-y-1.5 text-sm text-stone-300">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("help.day.title")}</h3>
          <p>{t("help.day.1")}</p>
          <p>{t("help.day.2")}</p>
        </section>

        <section className="mb-4 text-sm">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">{t("help.stats.title")}</h3>
          <ul className="space-y-1">
            {STAT_KEYS.map((k) => (
              <li key={k} className="flex gap-2 text-stone-300">
                <span className="w-5 shrink-0 text-center" aria-hidden>
                  {STAT_ICON[k]}
                </span>
                <span>
                  <span className="font-medium text-stone-100">{t(`stat.${k}`)}</span> — {t(`help.stat.${k}`)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-4 space-y-1.5 text-sm text-stone-300">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("help.out.title")}</h3>
          <p>{t("help.out.1")}</p>
          <p>{t("help.out.2")}</p>
        </section>

        <section className="mb-4 hidden text-sm sm:block">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">{t("help.keys.title")}</h3>
          <table className="w-full">
            <tbody>
              {SHORTCUTS.map(([keys, label]) => (
                <tr key={label}>
                  <td className="w-24 py-0.5 pr-3 align-top">
                    <kbd className="rounded border border-night-600 bg-night-800 px-1.5 py-0.5 font-mono text-[11px] text-stone-200">{keys}</kbd>
                  </td>
                  <td className="py-0.5 text-stone-300">{t(label)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <button type="button" onClick={onClose} autoFocus className="w-full rounded-lg bg-lamp-500 px-4 py-2.5 font-medium text-black hover:bg-lamp-400">
          {t("tip.ok")}
        </button>
      </div>
    </div>
  );
}
