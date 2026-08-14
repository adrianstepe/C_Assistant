import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseProspectsCsv, type ParsedProspects } from "./csv";

/**
 * Loads the outreach list from `data/prospects.csv`.
 *
 * Server-only, and read per request rather than imported: `/admin/leads` is
 * `force-dynamic`, so editing the CSV and reloading the page is enough to see
 * the change. Importing it would bake the list into the bundle and mean a
 * rebuild for every edit.
 *
 * A missing or unreadable file yields an empty list rather than a crash. The
 * tracker is an internal tool for one operator; showing it empty with the
 * reason on screen is more useful than a 500 that hides which file is wrong.
 */

const CSV_PATH = path.join(process.cwd(), "data", "prospects.csv");

export async function loadProspectsFromFile(
  today: string,
): Promise<ParsedProspects> {
  let text: string;

  try {
    text = await readFile(CSV_PATH, "utf8");
  } catch (error) {
    const reason =
      error instanceof Error && "code" in error && error.code === "ENOENT"
        ? "data/prospects.csv does not exist yet."
        : `data/prospects.csv could not be read: ${
            error instanceof Error ? error.message : "unknown error"
          }`;
    return { prospects: [], errors: [reason] };
  }

  return parseProspectsCsv(text, today);
}
