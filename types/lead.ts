/**
 * Domain types for a qualified lead — the artefact the cleaning company's
 * owner or staff actually read and act on.
 *
 * Types only — no scoring rules, persistence or notification behaviour is
 * implemented yet.
 */

import type { IsoDateTime, StructuredEnquiry } from "./enquiry";

/** Workflow state, owned by the cleaning company's staff. */
export type LeadStatus =
  | "new"
  | "contacted"
  | "quoted"
  | "won"
  | "lost"
  | "spam";

/**
 * How complete and how promising the enquiry looks. The rules behind this are
 * not defined yet; the band is what the UI will show.
 */
export type LeadQuality = "hot" | "warm" | "cold" | "unqualified";

export interface LeadQualification {
  quality: LeadQuality;
  /** 0–100. Interpretation is deliberately left to the scoring rules. */
  score: number;
  /** Short, human-readable justifications shown next to the score. */
  reasons: string[];
}

export interface Lead {
  id: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  status: LeadStatus;
  qualification: LeadQualification;
  enquiry: StructuredEnquiry;
  /** Free-text notes added by staff after the lead was created. */
  staffNotes?: string;
}

/** Compact shape for list views, so the inbox need not load full transcripts. */
export interface LeadSummary {
  id: string;
  createdAt: IsoDateTime;
  status: LeadStatus;
  quality: LeadQuality;
  contactName: string;
  companyName?: string;
  headline: string;
}
