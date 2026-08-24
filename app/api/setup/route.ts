import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  isFilled,
  isValidEmail,
  isValidName,
  isValidPhone,
  isValidWebsite,
} from "@/lib/validation";
import { readLeadsDatabaseConfig } from "@/lib/db/config";
import { getLeadsDatabase } from "@/lib/db/client";
import {
  ensureSchema,
  findSetupRequestSlug,
  insertSetupRequest,
  slugExists,
} from "@/lib/db/store";
import { clientKey } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit/shared";

/**
 * Public intake for the post-checkout setup questionnaire.
 *
 * Replaces the copy-paste-an-email handoff the form used to end with: the
 * answers land straight in the datastore as an INACTIVE customer row, ready
 * for a human to review, confirm payment against, and switch on by setting
 * `enabled`. Nothing about this endpoint can make a tenant live — that is
 * the kill-switch column's whole point.
 *
 * Status codes follow the same discipline as `/api/leads`:
 * 400 unusable body, 413 too large, 429 limited, 500 storage failure,
 * 201 received (including a retried submission, which de-duplicates).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Setup submissions are rare; the limits reflect that, not chat traffic. */
const PER_HOUR = { limit: 6, windowMs: 60 * 60_000 };
const PER_DAY = { limit: 20, windowMs: 24 * 60 * 60_000 };

const MAX_BODY_BYTES = 16 * 1024;
/** Fastest plausible human fill of a nine-field form they just paid behind. */
const MIN_ELAPSED_MS = 4_000;

function tooMany(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

interface SetupValues {
  companyName: string;
  website: string;
  contactName: string;
  email: string;
  phone: string;
  leadEmail: string;
  serviceAreas: string;
  services: string;
  notes: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Mirrors the form's own validation exactly; the client is not trusted. */
function parseValues(value: unknown): SetupValues | null {
  if (!isRecord(value)) return null;
  const raw = value;
  const text = (key: string, max: number): string =>
    typeof raw[key] === "string" ? (raw[key] as string).trim().slice(0, max) : "";

  const values: SetupValues = {
    companyName: text("companyName", 120),
    website: text("website", 200),
    contactName: text("contactName", 80),
    email: text("email", 254),
    phone: text("phone", 40),
    leadEmail: text("leadEmail", 254),
    serviceAreas: text("serviceAreas", 400),
    services: text("services", 400),
    notes: text("notes", 2_000),
  };

  if (!isFilled(values.companyName, 120)) return null;
  if (!isValidName(values.contactName)) return null;
  if (!isValidEmail(values.email)) return null;
  if (!isValidWebsite(values.website)) return null;
  if (!isValidPhone(values.phone)) return null;
  // Blank means "same as our contact email", same as the form says.
  const leadEmail = values.leadEmail === "" ? values.email : values.leadEmail;
  if (!isValidEmail(leadEmail)) return null;
  if (!isFilled(values.serviceAreas, 400)) return null;
  if (!isFilled(values.services, 400)) return null;

  return { ...values, leadEmail };
}

function slugify(companyName: string): string {
  return (
    companyName
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/g, "") || "cleaning-company"
  );
}

async function chooseSlug(sql: ReturnType<typeof getLeadsDatabase>, base: string): Promise<string> {
  if (!(await slugExists(sql, base))) return base;
  for (let n = 2; n <= 40; n += 1) {
    const candidate = `${base}-${n}`;
    if (!(await slugExists(sql, candidate))) return candidate;
  }
  // Effectively unreachable; still deterministic enough to be safe.
  const salt = createHash("sha256").update(base).digest("hex").slice(0, 6);
  return `${base}-${salt}`;
}

export async function POST(request: Request): Promise<NextResponse> {
  const hour = await checkSharedRateLimit(clientKey(request.headers, "setup-hr"), PER_HOUR);
  if (!hour.allowed) return tooMany(hour.retryAfterSeconds);
  const day = await checkSharedRateLimit(clientKey(request.headers, "setup-day"), PER_DAY);
  if (!day.allowed) return tooMany(day.retryAfterSeconds);

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  const record = body as Record<string, unknown>;

  const values = parseValues(record.values);
  if (!values) {
    return NextResponse.json(
      { error: "Some answers need checking before this can be sent." },
      { status: 400 },
    );
  }

  const meta = isRecord(record.meta) ? record.meta : {};
  const rawElapsed = meta.elapsedMs;
  const elapsedMs = typeof rawElapsed === "number" && Number.isFinite(rawElapsed)
    ? rawElapsed
    : Number.MAX_SAFE_INTEGER;

  // Same two bot tells as enquiry intake.
  if (typeof record.companyWebsite === "string" && record.companyWebsite.trim() !== "") {
    console.warn("[setup] honeypot field filled; dropping submission");
    return NextResponse.json({ received: true }, { status: 201 });
  }
  if (elapsedMs < MIN_ELAPSED_MS) {
    console.warn(`[setup] submitted after ${String(elapsedMs)}ms; dropping submission`);
    return NextResponse.json({ received: true }, { status: 201 });
  }

  const dbConfig = readLeadsDatabaseConfig();
  if (!dbConfig) {
    // Honest and specific: the form cannot do its job yet, and pretending
    // otherwise would lose a new customer's details silently.
    console.error("[setup] submission arrived with no datastore configured");
    return NextResponse.json(
      { error: "Setup cannot be received right now. Please email us instead." },
      { status: 503 },
    );
  }

  const eventId = normaliseEventId(record.eventId, values.email, values.companyName);
  const configPayload = {
    website: values.website,
    phone: values.phone,
    serviceAreas: values.serviceAreas,
    services: values.services,
    notes: values.notes === "" ? undefined : values.notes,
  };

  try {
    const sql = getLeadsDatabase(dbConfig);
    await ensureSchema(sql);

    // A retried submission resolves to its original slug before any slug
    // generation happens, so a retry can never mint a second tenant row.
    const existingSlug = await findSetupRequestSlug(sql, eventId);
    if (existingSlug) {
      console.info(`[setup] duplicate setup submission ${eventId}; acknowledged`);
      return NextResponse.json(
        { received: true, slug: existingSlug, status: "received" },
        { status: 201 },
      );
    }

    const base = await chooseSlug(sql, slugify(values.companyName));
    const result = await insertSetupRequest(sql, {
      slug: base,
      companyName: values.companyName,
      contactName: values.contactName,
      leadRecipientEmail: values.leadEmail,
      config: configPayload,
      eventId,
    });

    if (!result.inserted && result.slugTaken) {
      // A race between choosing and inserting. One salted retry settles it.
      const fallbackSlug = `${slugify(values.companyName)}-${eventId.slice(-4)}`;
      const retried = await insertSetupRequest(sql, {
        slug: fallbackSlug,
        companyName: values.companyName,
        contactName: values.contactName,
        leadRecipientEmail: values.leadEmail,
        config: configPayload,
        eventId,
      });
      if (!retried.inserted) {
        return NextResponse.json({ error: "Could not store setup." }, { status: 500 });
      }
      return NextResponse.json(
        { received: true, slug: fallbackSlug, status: "received" },
        { status: 201 },
      );
    }

    return NextResponse.json({ received: true, slug: base, status: "received" }, { status: 201 });
  } catch (error) {
    console.error(`[setup] failed to store submission ${eventId}`, error);
    return NextResponse.json(
      { error: "Setup could not be stored. Please try again or email us." },
      { status: 500 },
    );
  }
}

function normaliseEventId(value: unknown, email: string, company: string): string {
  if (typeof value === "string" && /^set_[0-9a-zA-Z-]{6,64}$/.test(value)) {
    return value;
  }
  const hash = createHash("sha256").update(`${email}|${company}`).digest("hex").slice(0, 32);
  return `set_h_${hash}`;
}
