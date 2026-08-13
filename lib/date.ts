import type { IsoDate } from "@/types/prospect";

/** The business operates on UK time; all "today" logic is anchored there. */
const TIME_ZONE = "Europe/London";

/** Today in `YYYY-MM-DD`, London time. */
export function todayIso(): IsoDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Whole days from `from` to `to`. Positive when `to` is later.
 * Both dates are treated as UTC midnight, so DST never shifts the result.
 */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** e.g. `13 Aug 2026`. Formatted in UTC so server and client agree. */
export function formatDate(date: IsoDate): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Compact relative label for table cells: `today`, `4d ago`, `in 3d`. */
export function formatRelativeDays(date: IsoDate, today: IsoDate): string {
  const diff = daysBetween(date, today);
  if (diff === 0) return "today";
  if (diff > 0) return `${diff}d ago`;
  return `in ${-diff}d`;
}

/** Adds `days` to an ISO date, returning a new ISO date. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const ms = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** True for a well-formed `YYYY-MM-DD` string that names a real date. */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}
