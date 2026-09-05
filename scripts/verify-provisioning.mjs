/**
 * Provisioning-v1 verification: automatic go-live, its gates, and the owner
 * alert.
 *
 *   node scripts/verify-provisioning.mjs \
 *     --db-url "postgres://linwick:linwick@127.0.0.1:54329/linwick" [--port 3341]
 *
 * Boots THREE application instances sequentially against a local Postgres and
 * a raw-node stub Resend (same discipline as verify-phase3 — no SDK anywhere):
 *
 *   A. SENDING ENABLED with OWNER_NOTIFICATION_EMAIL set. Proves:
 *      - a setup submission alone leaves the tenant INACTIVE;
 *      - a verified, genuinely-paid checkout event flips it live in the SAME
 *        request, writes one audit row, and fires exactly ONE synchronous
 *        owner alert;
 *      - replaying that webhook changes nothing (no second flip/alert);
 *      - an UNPAID checkout session never enables anything;
 *      - an `invoice.paid` event enables a form-first tenant;
 *      - a paid event for a DIFFERENT email matches nothing;
 *      - a paused tenant's capture page is indistinguishable from a 404
 *        again (the manual override keeps its teeth).
 *   B. FLAG OFF. Proves enablement is independent of the mail seam: tenants
 *      still go live, and ZERO requests reach the provider.
 *   C. FLAG ON, NO RECIPIENT. Proves the second gate: enablement works, no
 *      request is sent, and the log says exactly why it stayed silent.
 *
 * Every assertion is a hard check; non-zero exit on the first broken promise.
 */
import { parseArgs } from "node:util";
import { createServer } from "node:http";
import postgres from "postgres";
import {
  check,
  checkEqual,
  summarise,
  postJson,
  startApp,
  signStripePayload,
} from "./lib/harness.mjs";

const args = parseArgs({
  options: {
    "db-url": { type: "string" },
    port: { type: "string", default: "3341" },
  },
});
const DB_URL = args.values["db-url"];
if (!DB_URL) {
  console.error("Usage: node scripts/verify-provisioning.mjs --db-url <postgres://...>");
  process.exit(2);
}
const PORT_A = Number(args.values.port);
const PORT_B = PORT_A + 1;
const PORT_C = PORT_A + 2;

const OWNER_EMAIL = "owner@stub.example";
/** Arbitrary: only this script's fixtures are signed with it. */
const WEBHOOK_SECRET = "whsec_provisioning_verification";

const sql = postgres(DB_URL, { max: 1 });

// Rerunnable: clear previous runs so counts start from zero every time.
await sql`delete from leads where tenant_slug like 'prov-check-%' or event_id like 'prov_evt_%'`;
await sql`delete from customers where slug like 'prov-check-%'`;

// ---------------------------------------------------------------------------
// stub Resend

let messageIdCounter = 0;
const stubRequests = [];

const stubServer = createServer((request, response) => {
  let raw = "";
  request.on("data", (chunk) => {
    raw += chunk;
  });
  request.on("end", () => {
    let body = null;
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
    stubRequests.push({ auth: request.headers.authorization ?? "", body });
    messageIdCounter += 1;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ id: `re_stub_${String(messageIdCounter).padStart(4, "0")}` }));
  });
});
await new Promise((resolve) => stubServer.listen(0, "127.0.0.1", resolve));
const STUB_URL = `http://127.0.0.1:${stubServer.address().port}`;

function ownerAlerts() {
  return stubRequests.filter(
    (entry) =>
      Array.isArray(entry.body?.to) &&
      entry.body.to[0] === OWNER_EMAIL &&
      String(entry.body.subject ?? "").startsWith("Linwick:"),
  );
}

// ---------------------------------------------------------------------------
// fixtures

async function postSignedStripeEvent(port, payload) {
  const signature = signStripePayload(payload, WEBHOOK_SECRET);
  return postJson(`http://127.0.0.1:${port}`, "/api/stripe/webhook", payload, {
    "stripe-signature": signature,
  });
}

function checkoutCompletedFixture({ eventId, email, paid }) {
  return JSON.stringify({
    id: eventId,
    object: "event",
    api_version: "2026-07-29.dahlia",
    created: Math.floor(Date.now() / 1000),
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${eventId.slice(-8)}`,
        object: "checkout.session",
        payment_status: paid ? "paid" : "unpaid",
        currency: "gbp",
        amount_total: 22800,
        customer_email: email,
        customer_details: { email },
        subscription: "sub_prov_fixture",
      },
    },
  });
}

function invoicePaidFixture({ eventId, email }) {
  return JSON.stringify({
    id: eventId,
    object: "event",
    api_version: "2026-07-29.dahlia",
    created: Math.floor(Date.now() / 1000),
    type: "invoice.paid",
    data: {
      object: {
        id: `in_${eventId.slice(-8)}`,
        object: "invoice",
        number: "INV-0001",
        customer_email: email,
        amount_paid: 7900,
        currency: "gbp",
        billing_reason: "subscription_cycle",
      },
    },
  });
}

let submissionCounter = 0;
async function submitSetup(base, { companyName, email }) {
  submissionCounter += 1;
  return postJson(`${base}/api/setup`, "", {
    values: {
      companyName,
      website: `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.co.uk`,
      contactName: "Provision Tester",
      email,
      phone: "0161 496 0000",
      // Blank: must default to the contact email server-side.
      leadEmail: "",
      serviceAreas: "Salford, Trafford",
      services: "Office cleaning",
      notes: "",
    },
    meta: { elapsedMs: 60_000 },
    companyWebsite: "",
    eventId: `set_prov_${String(submissionCounter).padStart(3, "0")}`,
  });
}

async function tenantState(slug) {
  const rows = await sql`
    select slug, enabled from customers where slug = ${slug} limit 1
  `;
  return rows[0] ?? null;
}

async function auditRowCount(slug) {
  const rows = await sql`
    select count(*)::int as n from leads
    where kind = 'tenant_enabled' and tenant_slug = ${slug}
  `;
  return rows[0]?.n ?? 0;
}

async function capturePageStatus(base, slug) {
  const response = await fetch(`${base}/c/${slug}`);
  await response.body?.cancel().catch(() => {});
  return response.status;
}

// ---------------------------------------------------------------------------
// instance A: sending enabled, recipient configured

console.log("\n[instance A: alerts armed]");
{
  const app = await startApp({
    name: "provisioning-a",
    port: PORT_A,
    env: {
      LEADS_DATABASE_URL: DB_URL,
      STRIPE_SECRET_KEY: "sk_test_verify_placeholder",
      STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
      EMAIL_SENDING_ENABLED: "true",
      RESEND_API_KEY: "re_stub_owner_alerts_key",
      RESEND_BASE_URL: STUB_URL,
      OWNER_NOTIFICATION_EMAIL: OWNER_EMAIL,
    },
  });

  // [A1] setup alone stores inactive
  const setup1 = await submitSetup(app.base, {
    companyName: "Prov Check One Ltd",
    email: "buyer1@prov-check.example",
  });
  checkEqual(setup1.status, 201, "[A1] setup submission accepted");
  const slug1 = setup1.body?.slug ?? "";
  check(slug1.startsWith("prov-check-one"), `[A1] slug reserved (${slug1})`);
  checkEqual((await tenantState(slug1))?.enabled, false, "[A1] tenant starts INACTIVE");
  checkEqual(await auditRowCount(slug1), 0, "[A1] no enablement audit row yet");

  // [A2] verified paid checkout -> live in the same request, one audit, one alert
  const alertsBefore = ownerAlerts().length;
  const paidEventId = "prov_evt_checkout_paid_1";
  const delivered = await postSignedStripeEvent(
    PORT_A,
    checkoutCompletedFixture({ eventId: paidEventId, email: "Buyer1@prov-check.example", paid: true }),
  );
  checkEqual(delivered.status, 200, "[A2] signed paid checkout accepted");
  checkEqual(delivered.body?.handled, true, "[A2] event acted on");
  checkEqual((await tenantState(slug1))?.enabled, true, "[A2] tenant went LIVE automatically");
  checkEqual(await auditRowCount(slug1), 1, "[A2] exactly one enablement audit row");

  const alertsAfter = ownerAlerts();
  checkEqual(alertsAfter.length - alertsBefore, 1, "[A2] exactly one owner alert fired");
  check(
    String(alertsAfter[0]?.body?.subject ?? "").includes("Prov Check One"),
    "[A2] alert names the company",
  );
  checkEqual(alertsAfter[0]?.body?.from, "enquiries@linwick.co.uk", "[A2] alert FROM the brand address");
  check(
    typeof alertsAfter[0]?.auth === "string" && alertsAfter[0].auth.startsWith("Bearer re_stub_"),
    "[A2] alert carried the configured key",
  );

  // [A3] redelivery of the same event is a no-op end to end
  const replayed = await postSignedStripeEvent(
    PORT_A,
    checkoutCompletedFixture({ eventId: paidEventId, email: "buyer1@prov-check.example", paid: true }),
  );
  checkEqual(replayed.status, 200, "[A3] redelivered event acknowledged");
  checkEqual(ownerAlerts().length, alertsAfter.length, "[A3] no second alert on replay");
  checkEqual(await auditRowCount(slug1), 1, "[A3] no duplicate audit row");

  // [A4] unpaid checkout session enables NOTHING
  const setup2 = await submitSetup(app.base, {
    companyName: "Prov Check Two Ltd",
    email: "buyer2@prov-check.example",
  });
  const slug2 = setup2.body?.slug ?? "";
  const unpaid = await postSignedStripeEvent(
    PORT_A,
    checkoutCompletedFixture({ eventId: "prov_evt_checkout_unpaid", email: "buyer2@prov-check.example", paid: false }),
  );
  checkEqual(unpaid.status, 200, "[A4] unpaid-but-signed session acknowledged");
  checkEqual(unpaid.body?.handled, true, "[A4] recorded, not rejected");
  checkEqual((await tenantState(slug2))?.enabled, false, "[A4] pending payment does NOT enable");
  checkEqual(await auditRowCount(slug2), 0, "[A4] no audit row for a pending payment");

  // [A5] invoice.paid (money collected) enables a form-first tenant
  const invoice = await postSignedStripeEvent(
    PORT_A,
    invoicePaidFixture({ eventId: "prov_evt_invoice_paid", email: "buyer2@prov-check.example" }),
  );
  checkEqual(invoice.status, 200, "[A5] invoice.paid accepted");
  checkEqual((await tenantState(slug2))?.enabled, true, "[A5] invoice payment enables the waiting tenant");
  checkEqual(await auditRowCount(slug2), 1, "[A5] audit row written once");
  checkEqual(ownerAlerts().length, alertsAfter.length + 1, "[A5] one more owner alert");

  // [A6] a paid event for a different email matches nothing
  const setup3 = await submitSetup(app.base, {
    companyName: "Prov Check Three Ltd",
    email: "buyer3@prov-check.example",
  });
  const slug3 = setup3.body?.slug ?? "";
  await postSignedStripeEvent(
    PORT_A,
    checkoutCompletedFixture({ eventId: "prov_evt_other_buyer", email: "someoneelse@prov-check.example", paid: true }),
  );
  checkEqual((await tenantState(slug3))?.enabled, false, "[A6] mismatched email does NOT enable");
  checkEqual(ownerAlerts().length, alertsAfter.length + 1, "[A6] no alert without an enablement");

  // [A7] the manual pause override keeps its teeth
  await sql`update customers set enabled = false, updated_at = now() where slug = ${slug1}`;
  checkEqual(await capturePageStatus(app.base, slug1), 404, "[A7] paused tenant answers plain 404");

  await app.stop();
}

// ---------------------------------------------------------------------------
// instance B: flag off — enablement is independent of the mail seam

console.log("\n[instance B: flag OFF beats everything]");
{
  stubRequests.length = 0;

  const app = await startApp({
    name: "provisioning-b",
    port: PORT_B,
    env: {
      LEADS_DATABASE_URL: DB_URL,
      STRIPE_SECRET_KEY: "sk_test_verify_placeholder",
      STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
      EMAIL_SENDING_ENABLED: "",
      RESEND_API_KEY: "re_stub_should_be_unused",
      RESEND_BASE_URL: STUB_URL,
    },
  });

  const setup4 = await submitSetup(app.base, {
    companyName: "Prov Check Four Ltd",
    email: "buyer4@prov-check.example",
  });
  const slug4 = setup4.body?.slug ?? "";
  await postSignedStripeEvent(
    PORT_B,
    checkoutCompletedFixture({ eventId: "prov_evt_flag_off_sale", email: "buyer4@prov-check.example", paid: true }),
  );
  checkEqual((await tenantState(slug4))?.enabled, true, "[B1] tenant still goes live with mail off");
  checkEqual(stubRequests.length, 0, "[B2] ZERO requests reached the provider");
  checkEqual(await auditRowCount(slug4), 1, "[B3] audit row written regardless of mail state");

  await app.stop();
}

// ---------------------------------------------------------------------------
// instance C: flag on, no recipient — the second gate holds

console.log("\n[instance C: no recipient configured]");
{
  stubRequests.length = 0;

  const app = await startApp({
    name: "provisioning-c",
    port: PORT_C,
    env: {
      LEADS_DATABASE_URL: DB_URL,
      STRIPE_SECRET_KEY: "sk_test_verify_placeholder",
      STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
      EMAIL_SENDING_ENABLED: "true",
      RESEND_API_KEY: "re_stub_no_recipient_key",
      RESEND_BASE_URL: STUB_URL,
      OWNER_NOTIFICATION_EMAIL: "",
    },
  });

  const setup5 = await submitSetup(app.base, {
    companyName: "Prov Check Five Ltd",
    email: "buyer5@prov-check.example",
  });
  const slug5 = setup5.body?.slug ?? "";
  await postSignedStripeEvent(
    PORT_C,
    checkoutCompletedFixture({ eventId: "prov_evt_no_recipient_sale", email: "buyer5@prov-check.example", paid: true }),
  );
  checkEqual((await tenantState(slug5))?.enabled, true, "[C1] enablement unaffected by missing recipient");
  checkEqual(stubRequests.length, 0, "[C2] no send attempted without a recipient");
  checkEqual(await auditRowCount(slug5), 1, "[C3] audit trail intact");

  await app.stop();

  const logTail = await import("node:fs/promises").then((fs) =>
    fs.readFile(".verify-tmp/provisioning-c.log", "utf8"),
  );
  check(
    logTail.includes("NO owner alert was sent") && logTail.includes("OWNER_NOTIFICATION_EMAIL"),
    "[C4] suppression logged with the exact reason",
  );
}

process.exit(summarise("provisioning-v1") ? 0 : 1);
