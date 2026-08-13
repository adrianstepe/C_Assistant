import type {
  CompanyType,
  ContactSource,
  FunnelStage,
  ProspectSortKey,
  ProspectStatus,
  UrgencyLevel,
} from "@/types/prospect";

interface StatusMeta {
  label: string;
  /** Tailwind classes for the badge. Light and dark variants. */
  badgeClass: string;
  /** Terminal statuses drop out of the active pipeline. */
  terminal: boolean;
  /** Funnel stages this status counts as having reached. */
  reached: readonly FunnelStage[];
}

/**
 * Exhaustive by construction: adding a `ProspectStatus` without adding it here
 * is a type error.
 */
export const STATUS_META: Record<ProspectStatus, StatusMeta> = {
  new: {
    label: "New",
    badgeClass:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    terminal: false,
    reached: [],
  },
  contacted: {
    label: "Contacted",
    badgeClass:
      "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    terminal: false,
    reached: ["contacted"],
  },
  replied: {
    label: "Replied",
    badgeClass:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
    terminal: false,
    reached: ["contacted", "replied"],
  },
  interested: {
    label: "Interested",
    badgeClass:
      "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    terminal: false,
    reached: ["contacted", "replied", "interested"],
  },
  demo_sent: {
    label: "Demo Sent",
    badgeClass:
      "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
    terminal: false,
    reached: ["contacted", "replied", "interested", "demo"],
  },
  proposal: {
    label: "Proposal",
    badgeClass:
      "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
    terminal: false,
    reached: ["contacted", "replied", "interested", "demo", "proposal"],
  },
  won: {
    label: "Won",
    badgeClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    terminal: true,
    reached: ["contacted", "replied", "interested", "demo", "proposal", "won"],
  },
  lost: {
    label: "Lost",
    badgeClass:
      "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    terminal: true,
    // A loss implies they engaged; it does not imply they wanted a demo.
    reached: ["contacted", "replied"],
  },
  no_response: {
    label: "No Response",
    badgeClass:
      "bg-stone-100 text-stone-600 dark:bg-stone-900 dark:text-stone-400",
    terminal: true,
    reached: ["contacted"],
  },
};

/** Pipeline order, used for status chips and the status dropdown. */
export const PROSPECT_STATUSES = [
  "new",
  "contacted",
  "replied",
  "interested",
  "demo_sent",
  "proposal",
  "won",
  "lost",
  "no_response",
] as const satisfies readonly ProspectStatus[];

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  commercial_cleaning: "Commercial cleaning",
  office_cleaning: "Office cleaning",
  contract_cleaning: "Contract cleaning",
  facilities_management: "Facilities management",
  specialist_cleaning: "Specialist cleaning",
  window_cleaning: "Window cleaning",
  other: "Other",
};

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  google_maps: "Google Maps",
  company_website: "Company website",
  linkedin: "LinkedIn",
  directory: "Directory",
  trade_association: "Trade association",
  referral: "Referral",
  other: "Other",
};

interface UrgencyMeta {
  label: string;
  /** Tailwind classes for the urgency dot. */
  dotClass: string;
  /** Lower sorts first. */
  order: number;
}

export const URGENCY_META: Record<UrgencyLevel, UrgencyMeta> = {
  overdue: {
    label: "Overdue",
    dotClass: "bg-rose-500",
    order: 0,
  },
  due: {
    label: "Due",
    dotClass: "bg-amber-500",
    order: 1,
  },
  soon: {
    label: "Soon",
    dotClass: "bg-sky-500",
    order: 2,
  },
  waiting: {
    label: "Waiting",
    dotClass: "bg-zinc-300 dark:bg-zinc-600",
    order: 3,
  },
  done: {
    label: "Closed",
    dotClass: "bg-transparent ring-1 ring-zinc-300 dark:ring-zinc-700",
    order: 4,
  },
};

/** Levels that mean "this needs me to do something". */
export const ACTIONABLE_LEVELS: readonly UrgencyLevel[] = ["overdue", "due"];

export const SORT_LABELS: Record<ProspectSortKey, string> = {
  urgency: "Needs action first",
  company: "Company A–Z",
  added: "Recently added",
  lastTouch: "Least recently touched",
};
