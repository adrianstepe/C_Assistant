import type postgres from "postgres";
import {
  RETENTION_DAYS_AFTER_DELIVERY,
  RETENTION_HARD_CEILING_DAYS,
} from "@/lib/marketing/legal";

/**
 * Retention enforcement.
 *
 * The privacy notice and the processor agreement state fixed numbers: leads
 * are deleted 30 days after successful delivery, and nothing is kept longer
 * than 90 days under any circumstances. A promise nobody executes is a breach
 * with extra steps, so `/api/retention` calls this on a schedule and the
 * numbers here come from the same constants file the pages render.
 */

export interface RetentionResult {
  /** Rows deleted because delivery happened more than the retention tail ago. */
  deliveredPastRetention: number;
  /** Rows deleted by the hard ceiling regardless of their status. */
  pastHardCeiling: number;
}

export async function runRetentionSweep(
  sql: postgres.Sql,
  now: Date = new Date(),
): Promise<RetentionResult> {
  const deliveredCutoff = new Date(
    now.getTime() - RETENTION_DAYS_AFTER_DELIVERY * 24 * 60 * 60_000,
  );
  const ceilingCutoff = new Date(
    now.getTime() - RETENTION_HARD_CEILING_DAYS * 24 * 60 * 60_000,
  );

  // Delivered leads leave after the tail...
  const byDelivery = await sql`
    delete from leads
    where kind = 'enquiry'
      and delivered_at is not null
      and delivered_at < ${deliveredCutoff}
    returning id
  `;

  // ...and nothing at all outlives the ceiling, whatever its status.
  const byCeiling = await sql`
    delete from leads
    where kind = 'enquiry'
      and received_at < ${ceilingCutoff}
    returning id
  `;

  return {
    deliveredPastRetention: byDelivery.length,
    pastHardCeiling: byCeiling.length,
  };
}
