import type {
  IsoDate,
  Prospect,
  ProspectFilters,
  ProspectSortKey,
} from "@/types/prospect";
import { daysBetween } from "@/lib/date";
import { COMPANY_TYPE_LABELS, URGENCY_META } from "./constants";
import { deriveAction, lastTouchDate, needsAction } from "./urgency";

export const DEFAULT_FILTERS: ProspectFilters = {
  query: "",
  statuses: [],
  needsActionOnly: false,
  sort: "urgency",
};

/** Every field worth matching a free-text search against. */
function searchableText(prospect: Prospect): string {
  return [
    prospect.companyName,
    prospect.city,
    prospect.country,
    prospect.website,
    prospect.contactName,
    prospect.contactEmail,
    prospect.notes,
    prospect.personalizationAngle,
    prospect.response,
    prospect.nextAction?.description,
    COMPANY_TYPE_LABELS[prospect.companyType],
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}

/** Matches when every whitespace-separated term appears somewhere. */
export function matchesQuery(prospect: Prospect, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = searchableText(prospect);
  return terms.every((term) => haystack.includes(term));
}

function compareBy(
  key: ProspectSortKey,
  today: IsoDate,
): (a: Prospect, b: Prospect) => number {
  switch (key) {
    case "company":
      return (a, b) => a.companyName.localeCompare(b.companyName, "en-GB");
    case "added":
      return (a, b) => b.dateAdded.localeCompare(a.dateAdded);
    case "lastTouch":
      return (a, b) => lastTouchDate(a).localeCompare(lastTouchDate(b));
    case "urgency":
      return (a, b) => {
        const byLevel =
          URGENCY_META[deriveAction(a, today).level].order -
          URGENCY_META[deriveAction(b, today).level].order;
        if (byLevel !== 0) return byLevel;
        // Within a level, the one we have ignored longest comes first.
        return (
          daysBetween(lastTouchDate(b), today) -
          daysBetween(lastTouchDate(a), today)
        );
      };
  }
}

export function filterAndSortProspects(
  prospects: Prospect[],
  filters: ProspectFilters,
  today: IsoDate,
): Prospect[] {
  const matched = prospects.filter((prospect) => {
    if (!matchesQuery(prospect, filters.query)) return false;
    if (
      filters.statuses.length > 0 &&
      !filters.statuses.includes(prospect.status)
    ) {
      return false;
    }
    if (filters.needsActionOnly && !needsAction(prospect, today)) return false;
    return true;
  });

  // Sorting a copy keeps the caller's array untouched.
  return [...matched].sort(compareBy(filters.sort, today));
}

/** Applies the search and needs-action filters but not the status filter, so
 *  status chips can show counts for what the other filters already narrowed. */
export function narrowForStatusCounts(
  prospects: Prospect[],
  filters: ProspectFilters,
  today: IsoDate,
): Prospect[] {
  return prospects.filter(
    (prospect) =>
      matchesQuery(prospect, filters.query) &&
      (!filters.needsActionOnly || needsAction(prospect, today)),
  );
}
