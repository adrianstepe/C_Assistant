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
 * Reads the outreach list out of `data/prospects.csv`.
 *
 * Hand-rolled rather than pulled from npm: the repo runs on a single runtime
 * dependency, and the subset of CSV a spreadsheet actually emits is small
 * enough to parse correctly in about forty lines. It handles what Excel,
 * Numbers and Google Sheets produce on export — quoted fields, commas and
 * newlines inside quotes, doubled quotes as an escape, CRLF endings, and a
 * UTF-8 BOM.
 *
 * The parser never throws and never drops the whole file over one bad row. A
 * malformed row is skipped and reported in `errors`, because losing the other
 * 99 rows of a hand-maintained prospect list to one stray value would be a
 * worse failure than showing it slightly short.
 */

/** Splits CSV text into rows of raw cells. */
function tokenize(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  // Strip a BOM: Excel writes one, and it would otherwise become part of the
  // first header name and stop that column ever matching.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (quoted) {
      if (char === '"') {
        // A doubled quote inside a quoted field is a literal quote.
        if (input[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      // Treat CRLF as one break, not two.
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  // The final row only ends in a newline if the file happens to have a
  // trailing one.
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

/** Column names as they appear in the header row, normalised for matching. */
function normaliseHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]/g, "");
}

/**
 * Accepted spellings for each field. The canonical name is the `Prospect`
 * property; the alternatives are what a human is likely to type in a
 * spreadsheet.
 */
const COLUMN_ALIASES: Record<string, readonly string[]> = {
  id: ["id"],
  companyName: ["companyname", "company"],
  website: ["website", "url", "site"],
  city: ["city", "town"],
  country: ["country"],
  companyType: ["companytype", "type"],
  contactName: ["contactname", "contact"],
  contactEmail: ["contactemail", "email"],
  contactSource: ["contactsource", "source"],
  notes: ["notes", "note"],
  personalizationAngle: [
    "personalizationangle",
    "personalisationangle",
    "angle",
  ],
  status: ["status"],
  dateAdded: ["dateadded", "added"],
  dateContacted: ["datecontacted", "contacted"],
  dateFollowedUp: ["datefollowedup", "followedup", "followup"],
  response: ["response", "reply"],
  nextActionDescription: ["nextactiondescription", "nextaction", "action"],
  nextActionDueDate: ["nextactionduedate", "duedate", "due"],
};

/** Maps each canonical field to the column index holding it, if present. */
function mapColumns(header: string[]): Record<string, number> {
  const normalised = header.map(normaliseHeader);
  const columns: Record<string, number> = {};

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const index = normalised.findIndex((name) => aliases.includes(name));
    if (index !== -1) columns[field] = index;
  }

  return columns;
}

/**
 * Matches a free-text cell against a set of known keys.
 *
 * Accepts either the stored key (`commercial_cleaning`) or the label shown in
 * the UI (`Commercial cleaning`), since someone editing a spreadsheet will
 * reasonably copy whichever they last saw on screen.
 */
function matchKey<T extends string>(
  value: string,
  labels: Record<T, unknown>,
  labelText: (key: T) => string,
): T | null {
  const wanted = value.trim().toLowerCase().replace(/[\s-]/g, "_");
  if (wanted === "") return null;

  const keys = Object.keys(labels) as T[];
  return (
    keys.find((key) => key === wanted) ??
    keys.find(
      (key) => labelText(key).toLowerCase().replace(/[\s-]/g, "_") === wanted,
    ) ??
    null
  );
}

export interface ParsedProspects {
  prospects: Prospect[];
  /** One human-readable line per row that could not be read. */
  errors: string[];
}

/**
 * Parses the CSV text into prospects.
 *
 * `today` supplies the fallback for a missing `dateAdded`, passed in rather
 * than read from the clock so the result is deterministic for a given input.
 */
export function parseProspectsCsv(text: string, today: string): ParsedProspects {
  const rows = tokenize(text).filter((row) =>
    row.some((cell) => cell.trim() !== ""),
  );

  const [header, ...dataRows] = rows;
  if (!header) return { prospects: [], errors: [] };

  const columns = mapColumns(header);
  const errors: string[] = [];

  if (columns.companyName === undefined) {
    return {
      prospects: [],
      errors: [
        "No 'companyName' column found in the header row — nothing was loaded.",
      ],
    };
  }

  const prospects: Prospect[] = [];
  const seenIds = new Set<string>();

  dataRows.forEach((row, offset) => {
    // +2 puts the number back in spreadsheet terms: row 1 is the header.
    const lineNumber = offset + 2;

    const cell = (field: string): string => {
      const index = columns[field];
      return index === undefined ? "" : (row[index] ?? "").trim();
    };

    const companyName = cell("companyName");
    if (companyName === "") {
      errors.push(`Row ${lineNumber}: no company name — skipped.`);
      return;
    }

    const optional = (field: string): string | undefined => {
      const value = cell(field);
      return value === "" ? undefined : value;
    };

    /** Dates are dropped rather than guessed at; a wrong date skews urgency. */
    const isoDate = (field: string): string | undefined => {
      const value = cell(field);
      if (value === "") return undefined;
      if (!isIsoDate(value)) {
        errors.push(
          `Row ${lineNumber}: '${field}' is "${value}", expected YYYY-MM-DD — left blank.`,
        );
        return undefined;
      }
      return value;
    };

    const status =
      matchKey<ProspectStatus>(
        cell("status"),
        STATUS_META,
        (key) => STATUS_META[key].label,
      ) ?? "new";

    const companyType =
      matchKey<CompanyType>(
        cell("companyType"),
        COMPANY_TYPE_LABELS,
        (key) => COMPANY_TYPE_LABELS[key],
      ) ?? "commercial_cleaning";

    const contactSource =
      matchKey<ContactSource>(
        cell("contactSource"),
        CONTACT_SOURCE_LABELS,
        (key) => CONTACT_SOURCE_LABELS[key],
      ) ?? "other";

    // An unrecognised value is worth saying out loud: silently filing a
    // prospect under the wrong status would quietly distort the funnel stats.
    for (const [field, fallback] of [
      ["status", "new"],
      ["companyType", "commercial_cleaning"],
      ["contactSource", "other"],
    ] as const) {
      const raw = cell(field);
      if (raw !== "" && !isKnown(field, raw)) {
        errors.push(
          `Row ${lineNumber}: '${field}' value "${raw}" not recognised — used "${fallback}".`,
        );
      }
    }

    // A blank id column is the normal case for a freshly exported list. Row
    // position is stable for a given file, which is all the tracker needs to
    // tell two rows apart.
    let id = cell("id") || `csv-${lineNumber}`;
    if (seenIds.has(id)) {
      errors.push(`Row ${lineNumber}: duplicate id "${id}" — renamed.`);
      id = `${id}-${lineNumber}`;
    }
    seenIds.add(id);

    const nextActionDescription = optional("nextActionDescription");

    prospects.push({
      id,
      companyName,
      website: optional("website"),
      city: cell("city"),
      country: cell("country") || "United Kingdom",
      companyType,
      contactName: optional("contactName"),
      contactEmail: optional("contactEmail"),
      contactSource,
      notes: optional("notes"),
      personalizationAngle: optional("personalizationAngle"),
      status,
      dateAdded: isoDate("dateAdded") ?? today,
      dateContacted: isoDate("dateContacted"),
      dateFollowedUp: isoDate("dateFollowedUp"),
      response: optional("response"),
      nextAction: nextActionDescription
        ? {
            description: nextActionDescription,
            dueDate: isoDate("nextActionDueDate"),
          }
        : undefined,
    });
  });

  return { prospects, errors };
}

/** True when a raw cell names a key the corresponding enum actually has. */
function isKnown(field: string, raw: string): boolean {
  switch (field) {
    case "status":
      return (
        matchKey<ProspectStatus>(
          raw,
          STATUS_META,
          (key) => STATUS_META[key].label,
        ) !== null
      );
    case "companyType":
      return (
        matchKey<CompanyType>(
          raw,
          COMPANY_TYPE_LABELS,
          (key) => COMPANY_TYPE_LABELS[key],
        ) !== null
      );
    default:
      return (
        matchKey<ContactSource>(
          raw,
          CONTACT_SOURCE_LABELS,
          (key) => CONTACT_SOURCE_LABELS[key],
        ) !== null
      );
  }
}
