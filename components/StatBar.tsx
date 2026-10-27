import { INVERTED, STAT_ICON } from "@/lib/ui";
import type { StatKey } from "@/types/game";

interface Props {
  stat: StatKey;
  value: number;
  label: string;
  compact?: boolean;
}

function color(stat: StatKey, v: number) {
  const bad = INVERTED.includes(stat) ? 100 - v : v;
  if (bad <= 15) return "bg-red-500";
  if (bad <= 35) return "bg-orange-500";
  if (bad <= 60) return "bg-amber-400";
  return stat === "rep" ? "bg-sky-400" : "bg-emerald-500";
}

export default function StatBar({ stat, value, label, compact = false }: Props) {
  const v = Math.round(Math.max(0, Math.min(100, value)));
  const critical = INVERTED.includes(stat) ? v >= 80 : stat !== "rep" && v <= 15;
  return (
    <div className={critical ? "animate-pulseCrit" : undefined} title={`${label}: ${v}`}>
      <div className={`flex items-center justify-between ${compact ? "text-[10px]" : "text-xs"} text-stone-300`}>
        <span className="truncate">
          <span aria-hidden>{STAT_ICON[stat]}</span> {!compact && label}
        </span>
        <span className="font-medium tabular-nums">{v}</span>
      </div>
      <div className={`mt-0.5 w-full overflow-hidden rounded-sm bg-night-700 ${compact ? "h-1.5" : "h-2"}`}>
        <div className={`h-full ${color(stat, v)} transition-[width] duration-500`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
