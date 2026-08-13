/**
 * Domain types for an inbound cleaning enquiry, from raw submission through to
 * the structured form the AI assistant is expected to produce.
 *
 * Types only — no runtime validation, persistence or AI behaviour is
 * implemented yet.
 */

/** ISO 8601 timestamp, e.g. `2026-08-13T09:30:00.000Z`. */
export type IsoDateTime = string;

/** Where the enquiry originated. */
export type EnquirySource = "website_form" | "demo" | "manual";

export type ServiceType =
  | "office_cleaning"
  | "communal_area_cleaning"
  | "retail_cleaning"
  | "industrial_cleaning"
  | "school_cleaning"
  | "healthcare_cleaning"
  | "window_cleaning"
  | "deep_clean"
  | "end_of_tenancy"
  | "other";

export type CleaningFrequency =
  | "one_off"
  | "daily"
  | "weekdays_only"
  | "several_times_per_week"
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "ad_hoc";

/** When the customer wants work to start. */
export type Urgency = "asap" | "within_a_month" | "within_three_months" | "exploring";

export interface ContactDetails {
  fullName: string;
  companyName?: string;
  email: string;
  /** UK phone number, stored as entered. */
  phone?: string;
}

export interface SiteDetails {
  /** UK postcode, stored as entered. */
  postcode?: string;
  addressLine?: string;
  /** Number of separate sites covered by the enquiry. */
  siteCount?: number;
  approxFloorAreaSqFt?: number;
  /** e.g. "outside office hours", "after 18:00 weekdays". */
  accessNotes?: string;
}

/** A single turn in the assistant conversation. */
export interface EnquiryMessage {
  role: "customer" | "assistant";
  content: string;
  sentAt: IsoDateTime;
}

/** What the customer submitted before the assistant asked anything. */
export interface RawEnquiry {
  id: string;
  source: EnquirySource;
  submittedAt: IsoDateTime;
  contact: ContactDetails;
  /** The customer's own description of what they need. */
  message: string;
}

/**
 * The enquiry after the assistant has asked its follow-up questions.
 * Every field beyond `contact` is optional: the assistant may not get an
 * answer to everything, and a partial enquiry is still worth keeping.
 */
export interface StructuredEnquiry {
  raw: RawEnquiry;
  contact: ContactDetails;
  services: ServiceType[];
  frequency?: CleaningFrequency;
  urgency?: Urgency;
  site?: SiteDetails;
  /** Budget as expressed by the customer, in GBP. */
  budgetGbp?: {
    amount: number;
    period: "per_visit" | "per_month" | "per_year";
  };
  /** Follow-up questions the assistant asked and the answers it got. */
  transcript: EnquiryMessage[];
  /** Anything the assistant could not fit into the fields above. */
  notes?: string;
  structuredAt: IsoDateTime;
}
