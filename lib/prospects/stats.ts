import type {
  FunnelStage,
  IsoDate,
  Prospect,
  ProspectStats,
  ProspectStatus,
} from "@/types/prospect";
import { STATUS_META } from "./constants";
import { needsAction } from "./urgency";

/** Safe percentage; an empty denominator reads as 0, not NaN. */
function rate(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function countReached(prospects: Prospect[], stage: FunnelStage): number {
  return prospects.filter((p) => STATUS_META[p.status].reached.includes(stage))
    .length;
}

function countStatus(prospects: Prospect[], status: ProspectStatus): number {
  return prospects.filter((p) => p.status === status).length;
}

export function computeStats(
  prospects: Prospect[],
  today: IsoDate,
): ProspectStats {
  const total = prospects.length;
  const contacted = countReached(prospects, "contacted");
  const replied = countReached(prospects, "replied");
  const interested = countReached(prospects, "interested");
  const demos = countReached(prospects, "demo");
  const proposals = countReached(prospects, "proposal");
  const won = countReached(prospects, "won");

  return {
    total,
    contacted,
    replied,
    interested,
    demos,
    proposals,
    won,
    lost: countStatus(prospects, "lost"),
    noResponse: countStatus(prospects, "no_response"),
    needsAction: prospects.filter((p) => needsAction(p, today)).length,
    rates: {
      contact: rate(contacted, total),
      reply: rate(replied, contacted),
      demo: rate(demos, replied),
      win: rate(won, contacted),
    },
  };
}

/** Counts per status, for the filter chips. */
export function countByStatus(
  prospects: Prospect[],
): Record<ProspectStatus, number> {
  const counts = {
    new: 0,
    contacted: 0,
    replied: 0,
    interested: 0,
    demo_sent: 0,
    proposal: 0,
    won: 0,
    lost: 0,
    no_response: 0,
  } satisfies Record<ProspectStatus, number>;

  for (const prospect of prospects) {
    counts[prospect.status] += 1;
  }
  return counts;
}

/** Formats a 0–1 rate as a whole percentage. */
export function formatRate(value: number): string {
  return `${Math.round(value * 100)}%`;
}
