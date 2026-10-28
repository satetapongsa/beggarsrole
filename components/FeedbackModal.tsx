"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSettings } from "@/lib/i18n";
import { sendFeedback, type FeedbackKind } from "@/lib/online";
import type { GameState } from "@/types/game";

const KINDS: FeedbackKind[] = ["bug", "idea", "other"];
const TEXT_MIN = 5;
const TEXT_MAX = 1000; // keep in step with app/api/feedback/route.ts

/** Bug report / idea form. Pass `life` on screens that show one so the report says where it happened. */
export default function FeedbackModal({ onClose, life }: { onClose: () => void; life?: GameState | null }) {
  const { t, lang } = useSettings();
  const page = usePathname() ?? "/";
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [text, setText] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const length = Array.from(text.trim()).length;

  const submit = async () => {
    if (length < TEXT_MIN || state !== "idle") return;
    setState("sending");
    setError("");
    const res = await sendFeedback({ kind, text, contact: contact.trim(), page, lang, life: life && !life.ended ? life : null });
    if (res.ok) {
      setState("sent");
      return;
    }
    setState("idle");
    setError(t(res.error === "rate_limited" ? "feedback.error.rate" : res.error === "bad_text" ? "feedback.error.short" : "feedback.error.offline"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t("feedback.title")} onClick={onClose}>
      <div
        className="scrollbar-thin max-h-[85dvh] w-full max-w-lg animate-slideUp overflow-y-auto rounded-t-2xl border border-night-600 bg-night-900 p-5 text-left sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold text-lamp-300">{t("feedback.title")}</h2>

        {state === "sent" ? (
          <>
            <p className="mb-4 text-sm text-stone-300">{t("feedback.sent")}</p>
            <button type="button" onClick={onClose} autoFocus className="w-full rounded-lg bg-lamp-500 px-4 py-2.5 font-medium text-black hover:bg-lamp-400">
              {t("tip.ok")}
            </button>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <p className="mb-3 text-sm text-stone-400">{t("feedback.intro")}</p>

            <div className="mb-3 flex gap-2" role="radiogroup" aria-label={t("feedback.kind")}>
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => setKind(k)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-sm ${kind === k ? "border-lamp-500 bg-lamp-500/15 text-lamp-200" : "border-night-600 text-stone-300 hover:bg-night-800"}`}
                >
                  {t(`feedback.kind.${k}`)}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-xs text-stone-400" htmlFor="feedback-text">
              {t(`feedback.ask.${kind}`)}
            </label>
            <textarea
              id="feedback-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={TEXT_MAX}
              rows={5}
              autoFocus
              className="w-full resize-y rounded-lg border border-night-600 bg-night-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-lamp-500"
            />
            <div className="mb-3 text-right text-[11px] tabular-nums text-stone-500">
              {length}/{TEXT_MAX}
            </div>

            <label className="mb-1 block text-xs text-stone-400" htmlFor="feedback-contact">
              {t("feedback.contact")}
            </label>
            <input
              id="feedback-contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={100}
              className="mb-1 w-full rounded-lg border border-night-600 bg-night-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-lamp-500"
            />
            <p className="mb-3 text-[11px] text-stone-500">{t("feedback.contactHint")}</p>

            {life && !life.ended && <p className="mb-3 text-[11px] text-stone-500">{t("feedback.attached", { day: life.day, seed: life.seed })}</p>}
            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-night-600 px-4 py-2.5 text-stone-300 hover:bg-night-800">
                {t("feedback.cancel")}
              </button>
              <button
                type="submit"
                disabled={length < TEXT_MIN || state === "sending"}
                className="flex-1 rounded-lg bg-lamp-500 px-4 py-2.5 font-medium text-black hover:bg-lamp-400 disabled:opacity-40"
              >
                {state === "sending" ? t("feedback.sending") : t("feedback.send")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
