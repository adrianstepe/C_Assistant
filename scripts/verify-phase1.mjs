/**
 * Phase 1 verification: durable orders behind the datastore seam.
 *
 * Run against a local Postgres (see scripts/dev-postgres.ps1):
 *
 *   node scripts/verify-phase1.mjs \
 *     --db-url "postgres://linwick:linwick@127.0.0.1:54329/linwick"
 *
 * What it proves:
 *   1. The webhook's public contract is unchanged: 400 bad/missing signature,
 *      200 for verified events and for event types we do not act on, 503 when
 *      not configured, 500 when recording fails.
 *   2. A fixture replayed twice with the same Stripe event id inserts exactly
 *      ONE row — de-duplication finally exists at the store level.
 *   3. A datastore outage turns into a 500 (Stripe retries), not silence.
 *   4. With no datastore configured at all, behaviour is exactly what it was
 *      before phase 1: log only, 200.
 *   5. /admin/leads renders the read-only stored-records panel behind basic
 *      auth and shows the replayed event once.
 *
 * The four application instances here are booted one at a time on purpose:
 * Next 16 allows a single dev server per project directory, and each phase of
 * this verification needs a different environment anyway.
 */
import { parseArgs } from "node:util";
import postgres from "postgres";
import {
  check,
  checkEqual,
  summarise,
  postJson,
  startApp,
  signStripePayload,
  stripeCheckoutFixture,
} from "./lib/harness.mjs";

const args = parseArgs({
  options: {
    "db-url": { type: "string" },
    port: { type: "string", default: "3311" },
    // Dead-port target for the outage probe, so the test never fights a real
    // listener for the honour of refusing a connection.
    "dead-port": { type: "string", default: "54990" },
  },
});

const DB_URL = args.values["db-url"];
if (!DB_URL) {
  console.error("Usage: node scripts/verify-phase1.mjs --db-url <postgres://...>");
  process.exit(2);
}

const PORT = Number(args.values.port);
const DEAD_PORT = Number(args.values["dead-port"]);
const SECRET = "whsec_verify_phase1_local";
const ADMIN_USER = "verify-admin";
const ADMIN_PASSWORD = "verify-phase1";

const sql = postgres(DB_URL, { max: 1 });
const base = `http://127.0.0.1:${PORT}`;

/** Strips Next's embedded RSC payload so text assertions see rendered markup. */
function renderedHtml(fullHtml) {
  return fullHtml.replace(/<script[\s\S]*?<\/script>/g, "");
}

async function rowsFor(eventId) {
  // Before the first real delivery nothing has created the table yet, and
  // "relation does not exist" is then just zero rows.
  try {
    return await sql`select * from leads where event_id = ${eventId}`;
  } catch (error) {
    if (error?.code === "42P01") return [];
    throw error;
  }
}

async function countOrderEvents() {
  try {
    const [row] = await sql`select count(*)::int as n from leads where kind = 'order_event'`;
    return row.n;
  } catch (error) {
    if (error?.code === "42P01") return 0;
    throw error;
  }
}

function payloadOf(row) {
  const payload = row?.payload;
  if (typeof payload === "string") return JSON.parse(payload);
  return payload;
}

/** Delivers a signed fixture as Stripe would: raw body plus signature header. */
function deliverTo(targetBase, fixturePayload, signature = undefined) {
  return postJson(targetBase, "/api/stripe/webhook", fixturePayload, {
    "stripe-signature": signature ?? signStripePayload(fixturePayload, SECRET),
  });
}

/** Removes this run's fixture rows so reruns start from a known state. */
async function clearFixtures() {
  const ids = [
    "evt_replay_phase1_01",
    "evt_distinct_phase1_02",
    "evt_outage_01",
    "evt_logonly_01",
    "evt_unrecognised_01",
  ];
  try {
    await sql`delete from leads where event_id = any(${ids})`;
  } catch (error) {
    if (error?.code !== "42P01") throw error;
  }
}

try {
  await clearFixtures();

  const app = await startApp({
    name: "phase1-configured",
    port: PORT,
    env: {
      LEADS_DATABASE_URL: DB_URL,
      STRIPE_SECRET_KEY: "sk_test_verify_placeholder",
      STRIPE_WEBHOOK_SECRET: SECRET,
      ADMIN_USERNAME: ADMIN_USER,
      ADMIN_PASSWORD: ADMIN_PASSWORD,
      // Keep the model path off regardless of what a local .env.local says;
      // nothing in this verification has business reaching an external API.
      ASSISTANT_MODEL_ENABLED: "false",
    },
  });

  console.log("\n[1] webhook contract, unchanged");
  const unsigned = await fetch(`${base}/api/stripe/webhook`, {
    method: "POST",
    body: "{}",
  });
  checkEqual(unsigned.status, 400, "missing signature -> 400");

  const forged = await deliverTo(base, "{}", "t=1,v1=deadbeef");
  checkEqual(forged.status, 400, "invalid signature -> 400");  const unrecognisedPayload = JSON.stringify({
    id: "evt_unrecognised_01",
    object: "event",
    created: Math.floor(Date.now() / 1000),
    type: "customer.created",
    data: { object: { id: "cus_test" } },
  });
  const unrecognised = await deliverTo(base, unrecognisedPayload);
  checkEqual(unrecognised.status, 200, "unrecognised but signed event -> 200");
  checkEqual(unrecognised.body?.handled ?? null, false, "unrecognised event acknowledged, not acted on");
  checkEqual((await rowsFor("evt_unrecognised_01")).length, 0, "unrecognised event stores no row");

  console.log("\n[2] fixture replay: two deliveries, one row");
  const before = await countOrderEvents();
  const fixture = stripeCheckoutFixture({
    eventId: "evt_replay_phase1_01",
    email: "buyer@example.co.uk",
    paid: true,
  });

  const first = await deliverTo(base, fixture);
  checkEqual(first.status, 200, "first delivery -> 200");
  checkEqual(first.body?.handled ?? null, true, "first delivery handled");

  const second = await deliverTo(base, fixture);
  checkEqual(second.status, 200, "replayed delivery -> 200 (must NOT be a 500)");
  checkEqual((await rowsFor("evt_replay_phase1_01")).length, 1, "exactly one row after both deliveries");

  const stored = await rowsFor("evt_replay_phase1_01");
  check(
    stored.length > 0 && payloadOf(stored[0])?.eventId === "evt_replay_phase1_01",
    "full event payload stored as json",
  );

  const distinct = await deliverTo(
    base,
    stripeCheckoutFixture({
      eventId: "evt_distinct_phase1_02",
      email: "second@example.co.uk",
      paid: false,
    }),
  );
  checkEqual(distinct.status, 200, "a different event id -> 200");
  checkEqual((await rowsFor("evt_distinct_phase1_02")).length, 1, "different event gets its own row");
  checkEqual(await countOrderEvents(), before + 2, "total order-event rows grew by exactly 2");

  console.log("\n[3] admin panel sees the store, read-only");
  const denied = await fetch(`${base}/admin/leads`);
  checkEqual(denied.status, 401, "/admin/leads without credentials -> 401");
  const allowed = await fetch(`${base}/admin/leads`, {
    headers: {
      authorization: `Basic ${Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`).toString("base64")}`,
    },
  });
  checkEqual(allowed.status, 200, "/admin/leads with credentials -> 200");
  const html = renderedHtml(await allowed.text());
  check(html.includes("Stored records"), "stored-records panel rendered");
  check(html.includes("evt_replay_phase1_01"), "replayed event visible by id");
  check(
    (html.match(/evt_replay_phase1_01/g) ?? []).length === 1,
    "event id appears exactly once despite the redelivery",
  );

  await app.stop();

  console.log("\n[4] datastore outage -> 500 so Stripe retries");
  const outage = await startApp({
    name: "phase1-outage",
    port: PORT + 1,
    env: {
      LEADS_DATABASE_URL: `postgres://linwick:linwick@127.0.0.1:${DEAD_PORT}/linwick`,
      STRIPE_SECRET_KEY: "sk_test_verify_placeholder",
      STRIPE_WEBHOOK_SECRET: SECRET,
    },
  });
  const outageFixture = stripeCheckoutFixture({ eventId: "evt_outage_01", email: "out@example.co.uk" });
  const duringOutage = await deliverTo(outage.base, outageFixture);
  checkEqual(duringOutage.status, 500, "verified event while database unreachable -> 500");
  checkEqual((await rowsFor("evt_outage_01")).length, 0, "nothing half-written during the outage");
  await outage.stop();

  console.log("\n[5] unconfigured endpoint -> 503, unchanged");
  const bare = await startApp({
    name: "phase1-bare",
    port: PORT + 2,
    env: {
      // Blank, not merely unset: a local .env.local must not leak real Stripe
      // credentials into an instance whose point is to have none.
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
      LEADS_DATABASE_URL: DB_URL,
      ADMIN_USERNAME: "",
      ADMIN_PASSWORD: "",
    },
  });
  const refused = await postJson(bare.base, "/api/stripe/webhook", "{}", {
    "stripe-signature": "t=1,v1=whatever",
  });
  checkEqual(refused.status, 503, "unset Stripe configuration -> 503");
  await bare.stop();

  console.log("\n[6] log-only mode: Stripe configured, no database configured");
  // The pre-datastore behaviour must survive: with no LEADS_DATABASE_URL the
  // webhook records to the log and answers 200 — never throws for want of a
  // store that was deliberately not configured.
  const logOnly = await startApp({
    name: "phase1-logonly",
    port: PORT + 3,
    env: {
      STRIPE_SECRET_KEY: "sk_test_verify_placeholder",
      STRIPE_WEBHOOK_SECRET: SECRET,
      // Make absence explicit even if a local .env.local sets one.
      LEADS_DATABASE_URL: "",
    },
  });
  const logOnlyReply = await deliverTo(
    logOnly.base,
    stripeCheckoutFixture({ eventId: "evt_logonly_01", email: "log@example.co.uk" }),
  );
  checkEqual(logOnlyReply.status, 200, "verified event without any datastore -> 200");
  checkEqual(logOnlyReply.body?.handled ?? null, true, "event still handled");
  checkEqual((await rowsFor("evt_logonly_01")).length, 0, "and nothing was stored anywhere");
  await logOnly.stop();
} finally {
  await sql.end();
}

process.exitCode = summarise("phase 1") ? 0 : 1;
