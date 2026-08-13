import type {
  CompanyType,
  ContactSource,
  Prospect,
  ProspectStatus,
} from "@/types/prospect";
import { isIsoDate } from "@/lib/date";
import {
  COMPANY_TYPE_LABELS,
  CONTACT_SOURCE_LABELS,
  STATUS_META,
} from "./constants";

/**
 * The tracker deliberately has no database. Edits live in `localStorage` on the
 * machine doing the outreach, which is enough for a single operator running an
 * experiment. Bump the key if the shape ever changes incompatibly.
 */
const STORAGE_KEY = "prospects.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isOptionalIsoDate(value: unknown): boolean {
  return value === undefined || isIsoDate(value);
}

function isProspect(value: unknown): value is Prospect {
  if (!isRecord(value)) return false;

  const { status, companyType, contactSource, nextAction } = value;
  if (typeof status !== "string" || !(status in STATUS_META)) return false;
  if (typeof companyType !== "string" || !(companyType in COMPANY_TYPE_LABELS)) {
    return false;
  }
  if (
    typeof contactSource !== "string" ||
    !(contactSource in CONTACT_SOURCE_LABELS)
  ) {
    return false;
  }

  if (nextAction !== undefined) {
    if (!isRecord(nextAction)) return false;
    if (typeof nextAction.description !== "string") return false;
    if (!isOptionalIsoDate(nextAction.dueDate)) return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.companyName === "string" &&
    typeof value.city === "string" &&
    typeof value.country === "string" &&
    isIsoDate(value.dateAdded) &&
    isOptionalIsoDate(value.dateContacted) &&
    isOptionalIsoDate(value.dateFollowedUp) &&
    isOptionalString(value.website) &&
    isOptionalString(value.contactName) &&
    isOptionalString(value.contactEmail) &&
    isOptionalString(value.notes) &&
    isOptionalString(value.personalizationAngle) &&
    isOptionalString(value.response)
  );
}

/**
 * Reads saved prospects. Returns `null` when there is nothing usable stored,
 * so the caller can fall back to the seed data.
 */
export function loadProspects(): Prospect[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isProspect)) return null;
    return parsed;
  } catch {
    // Corrupt or unavailable storage is not worth failing the page over.
    return null;
  }
}

export function saveProspects(prospects: Prospect[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prospects));
  } catch {
    // Quota or private-mode failures are non-fatal; the session still works.
  }
}

export function clearStoredProspects(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — nothing the operator can do about it from here.
  }
}

/** Narrowing helpers for `<select>` values, which arrive as plain strings. */
export function toProspectStatus(value: string): ProspectStatus | null {
  return value in STATUS_META ? (value as ProspectStatus) : null;
}

export function toCompanyType(value: string): CompanyType | null {
  return value in COMPANY_TYPE_LABELS ? (value as CompanyType) : null;
}

export function toContactSource(value: string): ContactSource | null {
  return value in CONTACT_SOURCE_LABELS ? (value as ContactSource) : null;
}
