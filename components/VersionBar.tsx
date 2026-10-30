"use client";

// The game's version: a small tag in the top-right corner of every page, and on the title screen a
// full-width bar with what the latest update changed plus the whole history on demand.

import { useState } from "react";
import { usePathname } from "next/navigation";
import { CHANGELOG, VERSION } from "@/lib/changelog";
import { useSettings } from "@/lib/i18n";

export function VersionTag() {
  // the title screen shows the full bar instead
  if (usePathname() === "/") return null;
  return (
    <span aria-hidden className="pointer-events-none fixed right-1 top-0.5 z-50 text-[10px] tabular-nums text-stone-500">
      v{VERSION}
    </span>
  );
}

export default function VersionBar() {
  const { lang, t } = useSettings();
  const [open, setOpen] = useState(false);
  const latest = CHANGELOG[0];

  return (
    <div className="w-full border-b border-night-700 bg-night-900/90 text-xs">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-1.5">
        <span className="shrink-0 font-semibold text-lamp-300">{t("version.new")}</span>
        <p className="min-w-0 flex-1 truncate text-stone-300">{lang === "th" ? latest.th : latest.en}</p>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="shrink-0 text-stone-400 underline-offset-2 hover:text-stone-200 hover:underline">
          {open ? t("version.hide") : t("version.all")}
        </button>
        <span className="shrink-0 rounded bg-lamp-500/15 px-1.5 py-0.5 text-[11px] tabular-nums font-semibold text-lamp-300">v{VERSION}</span>
      </div>
      {open && (
        <ol className="mx-auto max-h-72 max-w-3xl space-y-2 overflow-y-auto px-4 pb-3 pt-1 text-left">
          {CHANGELOG.map((r) => (
            <li key={r.version} className="flex gap-3">
              <span className="w-10 shrink-0 tabular-nums text-lamp-300">v{r.version}</span>
              <span className="text-stone-300">{lang === "th" ? r.th : r.en}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
