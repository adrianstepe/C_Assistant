import type { IsoDate, Prospect, ProspectAction } from "@/types/prospect";
import { daysBetween } from "@/lib/date";
import { ACTIONABLE_LEVELS, STATUS_META } from "./constants";

/** Days a new prospect can sit untouched before it counts as overdue. */
const FIRST_CONTACT_OVERDUE_DAYS = 7;
const FIRST_CONTACT_DUE_DAYS = 3;

/** Days to wait after the last touch before chasing a silent prospect. */
const FOLLOW_UP_OVERDUE_DAYS = 7;
const FOLLOW_UP_DUE_DAYS = 4;

/** A dated action this far out is worth seeing, but not acting on yet. */
const SOON_WINDOW_DAYS = 3;

/** The most recent day we did something to this prospect. */
export function lastTouchDate(prospect: Prospect): IsoDate {
  return prospect.dateFollowedUp ?? prospect.dateContacted ?? prospect.dateAdded;
}

/**
 * Works out what — if anything — this prospect needs, relative to `today`.
 *
 * An explicit next action always wins. Without one, the status and the age of
 * the last touch decide, so a prospect can never go quietly stale.
 */
export function deriveAction(prospect: Prospect, today: IsoDate): ProspectAction {
  if (STATUS_META[prospect.status].terminal) {
    return { level: "done", label: "Closed" };
  }

  const { nextAction } = prospect;
  if (nextAction) {
    const { description, dueDate } = nextAction;
    if (!dueDate) {
      return { level: "due", label: description };
    }
    const overdueBy = daysBetween(dueDate, today);
    if (overdueBy > 0) {
      return { level: "overdue", label: `${description} · ${overdueBy}d overdue` };
    }
    if (overdueBy === 0) {
      return { level: "due", label: `${description} · today` };
    }
    if (-overdueBy <= SOON_WINDOW_DAYS) {
      return { level: "soon", label: `${description} · in ${-overdueBy}d` };
    }
    return { level: "waiting", label: `${description} · in ${-overdueBy}d` };
  }

  if (prospect.status === "new") {
    const age = daysBetween(prospect.dateAdded, today);
    if (age >= FIRST_CONTACT_OVERDUE_DAYS) {
      return { level: "overdue", label: `Send first email · added ${age}d ago` };
    }
    if (age >= FIRST_CONTACT_DUE_DAYS) {
      return { level: "due", label: "Send first email" };
    }
    return { level: "soon", label: "Send first email" };
  }

  if (prospect.status === "contacted") {
    const silentFor = daysBetween(lastTouchDate(prospect), today);
    if (silentFor >= FOLLOW_UP_OVERDUE_DAYS) {
      return { level: "overdue", label: `Follow up · silent ${silentFor}d` };
    }
    if (silentFor >= FOLLOW_UP_DUE_DAYS) {
      return { level: "due", label: "Follow up" };
    }
    return { level: "waiting", label: "Awaiting reply" };
  }

  // Replied, interested, demo sent or proposal, with no plan recorded.
  return { level: "due", label: "Set next action" };
}

export function needsAction(prospect: Prospect, today: IsoDate): boolean {
  return ACTIONABLE_LEVELS.includes(deriveAction(prospect, today).level);
}
