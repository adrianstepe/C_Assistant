/**
 * Domain types for the internal outreach tracker.
 *
 * A `Prospect` is a company we are selling *to* — distinct from a `Lead`
 * (see `./lead.ts`), which is an end customer produced by the quote assistant.
 */

/** Calendar date with no time component, `YYYY-MM-DD`. */
export type IsoDate = string;

export type ProspectStatus =
  | "new"
  | "contacted"
  | "replied"
  | "interested"
  | "demo_sent"
  | "proposal"
  | "won"
  | "lost"
  | "no_response";

export type CompanyType =
  | "commercial_cleaning"
  | "office_cleaning"
  | "contract_cleaning"
  | "facilities_management"
  | "specialist_cleaning"
  | "window_cleaning"
  | "other";

/** Where the contact details came from. */
export type ContactSource =
  | "google_maps"
  | "company_website"
  | "linkedin"
  | "directory"
  | "trade_association"
  | "referral"
  | "other";

/** The single next thing to do for this prospect. */
export interface NextAction {
  description: string;
  /** Omitted when the action has no deadline. */
  dueDate?: IsoDate;
}

export interface Prospect {
  id: string;
  companyName: string;
  website?: string;
  city: string;
  country: string;
  companyType: CompanyType;
  contactName?: string;
  contactEmail?: string;
  contactSource: ContactSource;
  /** Free-text working notes. */
  notes?: string;
  /** The specific hook used to personalise outreach to this company. */
  personalizationAngle?: string;
  status: ProspectStatus;
  dateAdded: IsoDate;
  dateContacted?: IsoDate;
  dateFollowedUp?: IsoDate;
  /** What they said back, in their words or paraphrased. */
  response?: string;
  nextAction?: NextAction;
}

/** Fields a user may edit from the dashboard. */
export type ProspectPatch = Partial<Omit<Prospect, "id" | "dateAdded">>;

/** How urgently a prospect needs attention. Derived, never stored. */
export type UrgencyLevel = "overdue" | "due" | "soon" | "waiting" | "done";

export interface ProspectAction {
  level: UrgencyLevel;
  /** Short imperative summary, e.g. "Follow up · 5d overdue". */
  label: string;
}

/** Funnel stages a prospect can be counted as having reached. */
export type FunnelStage =
  | "contacted"
  | "replied"
  | "interested"
  | "demo"
  | "proposal"
  | "won";

export interface ProspectStats {
  total: number;
  contacted: number;
  replied: number;
  interested: number;
  demos: number;
  proposals: number;
  won: number;
  lost: number;
  noResponse: number;
  needsAction: number;
  rates: {
    /** contacted / total */
    contact: number;
    /** replied / contacted */
    reply: number;
    /** demos / replied */
    demo: number;
    /** won / contacted */
    win: number;
  };
}

export type ProspectSortKey = "urgency" | "company" | "added" | "lastTouch";

export interface ProspectFilters {
  query: string;
  /** Empty means "all statuses". */
  statuses: ProspectStatus[];
  needsActionOnly: boolean;
  sort: ProspectSortKey;
}
