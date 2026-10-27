interface Props {
  icon: string;
  title: string;
  desc: string;
  energyLabel: string;
  costLabel?: string;
  lockReason?: string | null;
  onClick: () => void;
}

export default function ChoiceCard({ icon, title, desc, energyLabel, costLabel, lockReason, onClick }: Props) {
  const locked = !!lockReason;
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onClick}
      className={`card-lift group relative flex h-full flex-col rounded-lg border p-2.5 text-left sm:p-3 ${
        locked
          ? "cursor-not-allowed border-night-700 bg-night-900/60 opacity-60 grayscale"
          : "border-night-600 bg-night-800 hover:bg-night-700"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-2xl leading-none" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium leading-tight text-stone-100">{title}</div>
          <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-stone-400 sm:text-xs">{desc}</div>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2 text-[10px] sm:text-[11px]">
        <span className="rounded bg-night-950/70 px-1.5 py-0.5 text-amber-300">⚡ {energyLabel}</span>
        {costLabel && <span className="rounded bg-night-950/70 px-1.5 py-0.5 text-emerald-300">💰 {costLabel}</span>}
      </div>
      {locked && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-300 sm:text-[11px]">
          <span aria-hidden>🔒</span>
          <span className="line-clamp-2">{lockReason}</span>
        </div>
      )}
    </button>
  );
}
