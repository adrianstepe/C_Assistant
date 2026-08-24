/**
 * Phase 2 verification: tenant config, hosted capture intake, abuse controls.
 *
 *   node scripts/verify-phase2.mjs \
 *     --db-url "postgres://linwick:linwick@127.0.0.1:54329/linwick" [--port 3321]
 *
 * Boots ONE application instance against a local Postgres, seeds test tenants
 * straight into the `customers` table, and drives `/api/leads` and
 * `/api/setup` as an attacker and as a real browser would.
 *
 * Proven here:
 *   - unknown slug -> 404, disabled (kill-switched) slug -> 404, identical
 *   - a valid capture stores exactly one `enquiry` row; replaying it stores
 *     nothing more (event-id de-duplication)
 *   - malformed payloads -> 400; oversized bodies -> 413
 *   - filled honeypot and faster-than-human submissions answer 201 but store
 *     nothing (never teach the farm which requests failed)
 *   - per-IP minute limit trips with 429
 *   - the PER-TENANT daily cap actually trips: cap 3 -> fourth enquiry 429
 *   - setup submissions store inactive customers, de-duplicate, and uniquify
 *     slugs
 *   - the assistant route still answers offline after its move to shared
 *     rate counters
 */
import { parseArgs } from "node:util";
import postgres from "postgres";
import {
  check,
  checkEqual,
  summarise,
  postJson,
  startApp,
} from "./lib/harness.mjs";

const args = parseArgs({
  options: {
    "db-url": { type: "string" },
    port: { type: "string", default: "3321" },
  },
});

const DB_URL = args.values["db-url"];
if (!DB_URL) {
  console.error("Usage: node scripts/verify-phase2.mjs --db-url <postgres://...>");
  process.exit(2);
}
const PORT = Number(args.values.port);
const base = `http://127.0.0.1:${PORT}`;

const sql = postgres(DB_URL, { max: 1 });

const TENANT = "verify-cleaners";
const CAPPED = "capped-co";
const DISABLED = "disabled-co";

function enquiryBody({ eventId, slug = TENANT, elapsedMs = 60_000, honeypot = "", email = "buyer@example.co.uk", name = "Test Buyer" }) {
  return {
    headers: { "x-forwarded-for": "10.0.0.1" },
    body: {
      slug,
      eventId,
      companyWebsite: honeypot,
      meta: { elapsedMs },
      lead: {
        slots: {
          propertyType: { display: "commercial office", code: "office_cleaning" },
          location: { display: "Manchester", code: "manchester" },
          size: { display: "About 1,500 sq ft", code: "small" },
          frequency: { display: "3 times a week", code: "several_times_per_week" },
          preferredTime: { display: "Evenings", code: "evenings" },
          currentSituation: { display: "No, not currently", code: "no_current_cleaner" },
          requirements: { display: "Just general cleaning", code: "general" },
        },
        contact: { name, email, phone: "0161 555 0100" },
      },
    },
  };
}

async function post(body, ip, path = "/api/leads") {
  const response = await postJson(base, path, body, { "x-forwarded-for": ip });
  return response;
}

async function enquiryRows(eventId) {
  try {
    return await sql`select * from leads where event_id = ${eventId} and kind = 'enquiry'`;
  } catch (error) {
    if (error?.code === "42P01") return [];
    throw error;
  }
}

/** Runs a statement, treating "table does not exist yet" as nothing to clean. */
async function clean(statement) {
  try {
    await statement;
  } catch (error) {
    if (error?.code !== "42P01") throw error;
  }
}

async function seedTenants() {
  // Fresh state per run: tenants, their leads, and every rate window the
  // previous run may have left behind. The tables may not exist at all on a
  // fresh database - the app creates them on first use.
  await clean(sql`delete from leads where tenant_slug in (${TENANT}, ${CAPPED}, ${DISABLED})`);
  await clean(sql`delete from leads where event_id like 'enq_%' or event_id like 'set_%'`);
  await clean(sql`delete from customers where slug in (${TENANT}, ${CAPPED}, ${DISABLED})`);
  await clean(sql`delete from rate_windows`);
  await clean(sql`delete from customers where slug in ('sparkle-facilities', 'sparkle-facilities-2')`);
  await sql`
    insert into customers (slug, company_name, lead_recipient_email, config, enabled)
    values (${TENANT}, 'Verify Cleaners Ltd', 'leads@verify-cleaners.example',
            '{"serviceAreas":"Manchester, Salford","services":"Office cleaning"}'::jsonb, true)
  `;
  await sql`
    insert into customers (slug, company_name, lead_recipient_email, config, enabled, daily_enquiry_cap)
    values (${CAPPED}, 'Capped Co', 'leads@capped.example', '{}'::jsonb, true, 3)
  `;
  await sql`
    insert into customers (slug, company_name, lead_recipient_email, config, enabled)
    values (${DISABLED}, 'Disabled Co', 'leads@disabled.example', '{}'::jsonb, false)
  `;
}

try {
  await seedTenants();

  const app = await startApp({
    name: "phase2-api",
    port: PORT,
    env: {
      LEADS_DATABASE_URL: DB_URL,
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
      ASSISTANT_MODEL_ENABLED: "false",
      EMAIL_SENDING_ENABLED: "",
    },
  });

  console.log("\n[1] tenant routing");
  const noSlug = enquiryBody({ eventId: "enq_a02-nosluga" });
  delete noSlug.body.slug;
  const missingSlug = await postJson(base, "/api/leads", noSlug.body, {});
  checkEqual(missingSlug.status, 400, "request without a slug -> 400");

  const unknown = await post(
    { ...enquiryBody({ eventId: "enq_a03-unknown" }).body, slug: "no-such-tenant" },
    "10.0.0.99",
  );
  checkEqual(unknown.status, 404, "unknown slug -> 404");

  const disabled = await post(
    { ...enquiryBody({ eventId: "enq_a04-disabled" }).body, slug: DISABLED },
    "10.0.0.99",
  );
  checkEqual(disabled.status, 404, "kill-switched slug -> 404 (identical to unknown)");

  console.log("\n[2] capture, storage, replay");
  const first = enquiryBody({ eventId: "enq_b01-capturea" });
  const stored = await post(first.body, "10.0.0.11");
  checkEqual(stored.status, 201, "valid eight-slot capture -> 201");
  const rowsAfterOne = await enquiryRows("enq_b01-capturea");
  checkEqual(rowsAfterOne.length, 1, "exactly one enquiry row stored");
  check(
    rowsAfterOne[0] !== undefined &&
      String(rowsAfterOne[0].payload?.contact?.email ?? "") === "buyer@example.co.uk",
    "contact details stored in payload",
  );
  checkEqual(rowsAfterOne[0]?.tenant_slug ?? null, TENANT, "row attributed to the right tenant");

  const replay = await post(enquiryBody({ eventId: "enq_b01-capturea" }).body, "10.0.0.11");
  checkEqual(replay.status, 201, "replayed submission -> 201 again");
  checkEqual((await enquiryRows("enq_b01-capturea")).length, 1, "still exactly one row after the replay");

  console.log("\n[3] malformed and oversized input");
  const badJson = await fetch(`${base}/api/leads`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.14" },
    body: "{not json",
  });
  checkEqual(badJson.status, 400, "malformed JSON -> 400");

  const noSlots = await post(
    {
      slug: TENANT,
      eventId: "enq_c01-noslots",
      meta: { elapsedMs: 60_000 },
      lead: { slots: {}, contact: { name: "A Buyer", email: "a@example.co.uk" } },
    },
    "10.0.0.14",
  );
  checkEqual(noSlots.status, 400, "capture with no slot answers -> 400");

  const badEmail = await post(
    {
      ...enquiryBody({ eventId: "enq_c02-bademail" }).body,
      lead: {
        ...enquiryBody({ eventId: "enq_c02-bademail" }).body.lead,
        contact: { name: "A Buyer", email: "not-an-email" },
      },
    },
    "10.0.0.14",
  );
  checkEqual(badEmail.status, 400, "unusable contact email -> 400");

  const big = "x".repeat(17 * 1024);
  const oversized = await post(
    { slug: TENANT, eventId: "enq_c03-paddin", padding: big, lead: enquiryBody({ eventId: "enq_c03-paddin" }).body.lead },
    "10.0.0.14",
  );
  checkEqual(oversized.status, 413, "oversized body -> 413");

  console.log("\n[4] bot tells: dropped quietly, never stored");
  const honeypot = await post(
    enquiryBody({ eventId: "enq_d01-honeypot", honeypot: "http://spam.example" }).body,
    "10.0.0.12",
  );
  checkEqual(honeypot.status, 201, "filled honeypot gets a plausible 201");
  checkEqual((await enquiryRows("enq_d01-honeypot")).length, 0, "and stores nothing");

  const tooFast = await post(enquiryBody({ eventId: "enq_d02-toofast", elapsedMs: 120 }).body, "10.0.0.12");
  checkEqual(tooFast.status, 201, "faster-than-human submission gets a plausible 201");
  checkEqual((await enquiryRows("enq_d02-toofast")).length, 0, "and stores nothing");

  console.log("\n[5] per-IP minute limit trips");
  let saw429 = false;
  let sawHandled = false;
  for (let i = 0; i < 12; i += 1) {
    const reply = await post(
      enquiryBody({ eventId: `enq_e${String(i).padStart(2, "0")}-floodx` }).body,
      "10.0.0.13",
    );
    if (reply.status === 201 || reply.status === 400) sawHandled = true;
    if (reply.status === 429) {
      saw429 = true;
      break;
    }
  }
  check(sawHandled, "early requests were processed normally");
  check(saw429, "the eleventh-plus request from one IP trips 429 within a minute");

  console.log("\n[6] per-tenant daily cap actually trips");
  for (let i = 0; i < 3; i += 1) {
    const ok = await post(
      enquiryBody({
        eventId: `enq_f${String(i).padStart(2, "0")}-capten`,
        slug: CAPPED,
        email: `cap${i}@example.co.uk`,
      }).body,
      `10.0.1.${i}`,
    );
    checkEqual(ok.status, 201, `capped tenant enquiry ${i + 1} of 3 stored`);
  }
  const overCap = await post(
    enquiryBody({ eventId: "enq_f99-overcap", slug: CAPPED, email: "capover@example.co.uk" }).body,
    "10.0.1.51",
  );
  checkEqual(overCap.status, 429, "fourth enquiry against cap 3 -> 429");
  const cappedRows =
    await sql`select count(*)::int as n from leads where kind = 'enquiry' and tenant_slug = ${CAPPED}`;
  checkEqual(cappedRows[0]?.n ?? -1, 3, "exactly the three in-cap enquiries were stored");

  console.log("\n[7] setup submissions store inactive customers");
  const setupBody = {
    values: {
      companyName: "Sparkle Facilities",
      website: "sparklefacilities.co.uk",
      contactName: "Ada Owner",
      email: "ada@sparklefacilities.example",
      phone: "",
      leadEmail: "",
      serviceAreas: "Leeds and surroundings",
      services: "Offices, communal areas",
      notes: "",
    },
    meta: { elapsedMs: 90_000 },
    companyWebsite: "",
  };
  const setup1 = await post(setupBody, "10.0.2.9", "/api/setup");
  checkEqual(setup1.status, 201, "valid setup submission -> 201");
  check(typeof setup1.body?.slug === "string" && setup1.body.slug !== "", "response carries the reserved slug");
  const [customerRow] = await sql`select * from customers where slug = ${setup1.body.slug}`;
  check(customerRow !== undefined, "customer row created");
  checkEqual(customerRow?.enabled ?? null, false, "customer row starts INACTIVE");
  checkEqual(customerRow?.lead_recipient_email ?? null, "ada@sparklefacilities.example", "blank lead email falls back to contact email");
  const [setupLeadRow] =
    await sql`select * from leads where kind = 'setup_request' order by received_at desc limit 1`;
  check(setupLeadRow !== undefined, "setup submission recorded in admin-visible leads table");

  const setupReplay = await post(
    { ...setupBody, eventId: setupLeadRow.event_id },
    "10.0.2.9",
    "/api/setup",
  );
  checkEqual(setupReplay.status, 201, "replayed setup submission -> 201");
  checkEqual(setupReplay.body?.slug ?? null, setup1.body?.slug ?? null, "replay resolves to the ORIGINAL slug");

  // A genuinely NEW submission (fresh client-generated event id) for the
  // same company must not collide with the first draft's slug.
  const duplicateCompany = await post(
    {
      ...setupBody,
      eventId: `set_${crypto.randomUUID()}`,
      meta: { elapsedMs: 90_000 },
    },
    "10.0.2.10",
    "/api/setup",
  );
  checkEqual(duplicateCompany.status, 201, "second submission of the same company accepted");
  checkNotEqual(duplicateCompany.body?.slug ?? null, setup1.body?.slug ?? null, "with a DIFFERENT slug");

  console.log("\n[8] assistant route still answers offline");
  const assistant = await postJson(
    base,
    "/api/assistant",
    { message: "I need office cleaning in Manchester", lead: {}, history: [] },
    { "x-forwarded-for": "10.0.3.7" },
  );
  checkEqual(assistant.status, 200, "assistant POST -> 200");
  check(Array.isArray(assistant.body?.messages) && assistant.body.messages.length > 0, "assistant replies conversationally");

  await app.stop();
} finally {
  await sql.end();
}

function checkNotEqual(actual, notExpected, label) {
  const ok = actual !== notExpected;
  check(ok, `${label}${ok ? "" : ` (got ${JSON.stringify(actual)})`}`);
}

process.exitCode = summarise("phase 2 (API)") ? 0 : 1;
