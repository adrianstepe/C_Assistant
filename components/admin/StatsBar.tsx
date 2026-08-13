import type { ProspectStats } from "@/types/prospect";
import { formatRate } from "@/lib/prospects/stats";

interface TileProps {
  label: string;
  value: string;
  /** Draws attention to the one number that implies work to do. */
  emphasis?: boolean;
  sublabel?: string;
}

function Tile({ label, value, emphasis = false, sublabel }: TileProps) {
  return (
    <div
      className={`border-border rounded-lg border px-3 py-2 ${
        emphasis
          ? "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40"
          : "bg-surface"
      }`}
    >
      <div className="text-muted text-xs font-medium tracking-wide uppercase">
        {label}
      </div>
      <div
        className={`mt-0.5 text-xl font-semibold tabular-nums ${
          emphasis ? "text-rose-700 dark:text-rose-300" : ""
        }`}
      >
        {value}
      </div>
      {sublabel ? (
        <div className="text-muted mt-0.5 text-xs">{sublabel}</div>
      ) : null}
    </div>
  );
}

export function StatsBar({ stats }: { stats: ProspectStats }) {
  const { rates } = stats;
  return (
    <section aria-label="Pipeline summary" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        <Tile label="Needs action" value={String(stats.needsAction)} emphasis />
        <Tile label="Total" value={String(stats.total)} />
        <Tile label="Contacted" value={String(stats.contacted)} />
        <Tile label="Replies" value={String(stats.replied)} />
        <Tile label="Interested" value={String(stats.interested)} />
        <Tile label="Demos" value={String(stats.demos)} />
        <Tile label="Proposals" value={String(stats.proposals)} />
        <Tile label="Won" value={String(stats.won)} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile
          label="Contact rate"
          value={formatRate(rates.contact)}
          sublabel={`${stats.contacted} of ${stats.total}`}
        />
        <Tile
          label="Reply rate"
          value={formatRate(rates.reply)}
          sublabel={`${stats.replied} of ${stats.contacted} contacted`}
        />
        <Tile
          label="Demo rate"
          value={formatRate(rates.demo)}
          sublabel={`${stats.demos} of ${stats.replied} replies`}
        />
        <Tile
          label="Win rate"
          value={formatRate(rates.win)}
          sublabel={`${stats.won} of ${stats.contacted} contacted`}
        />
      </div>
    </section>
  );
}
