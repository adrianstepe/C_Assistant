/**
 * Phase 3 verification: the lead email pipeline against a local Resend stub.
 *
 *   node scripts/verify-phase3.mjs \
 *     --db-url "postgres://linwick:linwick@127.0.0.1:54329/linwick" [--port 3325]
 *
 * Boots TWO application instances sequentially:
 *
 *   A. SENDING ENABLED, pointed at a stub Resend HTTP server recording every
 *      request. Proves the happy lifecycle (pending -> sent by webhook),
 *      transient-failure retries ending in escalation, permanent failures
 *      skipping retries entirely, bounce-webhook escalation, webhook
 *      signature discipline, and sweep-route authentication.
 *   B. FLAG OFF with an API key still present, pointed at the SAME stub.
 *      Proves the off switch wins over credentials: zero outbound requests,
 *      stored rows stay `captured`, and both guarded routes answer 503.
 *
 * The stub is a raw node:http server - no SDK anywhere in sight, mirroring
 * the production seam, which is also raw fetch.
 */
import { parseArgs } from "node:util";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
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
    port: { type: "string", default: "3325" },
  },
});
const DB_URL = args.values["db-url"];
if (!DB_URL) {
  console.error("Usage: node scripts/verify-phase3.mjs --db-url <postgres://...>");
  process.exit(2);
}
const PORT_A = Number(args.values.port);
const PORT_B = PORT_A + 1;

const TENANT = "verify-mail";
/** Must match CONTACT_EMAIL in lib/marketing/brand.ts. */
const CONTACT_EMAIL = "adrians@stepedigital.com";

const sql = postgres(DB_URL, { max: 1 });

// ---------------------------------------------------------------------------
// stub Resend

let messageIdCounter = 0;
const stubRequests = [];
let stubMode = "ok"; // "ok" | "fail500" | "fail400"

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
    if (stubMode === "fail500") {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "stub unavailable" }));
      return;
    }
    if (stubMode === "fail400") {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "invalid recipient" }));
      return;
    }
    messageIdCounter += 1;
    const id = `re_stub_${String(messageIdCounter).padStart(4, "0")}`;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ id }));
  });
});
await new Promise((resolve) => stubServer.listen(0, "127.0.0.1", resolve));
const STUB_URL = `http://127.0.0.1:${stubServer.address().port}`;

function resetStub() {
  stubRequests.length = 0;
  stubMode = "ok";
}

function leadRows(eventId) {
  return sql`select * from leads where kind = 'enquiry' and event_id = ${eventId}`;
}

// ---------------------------------------------------------------------------
// svix-style signing, exactly what the dashboard's signing secret produces

const WEBHOOK_SECRET = "whsec_" +
  Buffer.from("phase3-verification-secret-key").toString("base64");

function signedWebhook(type, data, { corruptSignature = false, timestampOffsetSeconds = 0 } = {}) {
  const payload = JSON.stringify({ type, data, created_at: new Date().toISOString() });
  const id = `msg_test_${Math.random().toString(16).slice(2)}`;
  const timestamp = Math.floor(Date.now() / 1000) + timestampOffsetSeconds;
  const key = Buffer.from(WEBHOOK_SECRET.slice("whsec_".length), "base64");
  const signature = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");
  return {
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": String(timestamp),
      "svix-signature": corruptSignature ? `v1,badsignature==` : signature,
    },
    body: payload,
  };
}

async function postWebhook(port, signed) {
  const response = await fetch(`http://127.0.0.1:${port}/api/webhooks/resend`, {
    method: "POST",
    headers: signed.headers,
    body: signed.body,
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, body: json };
}

function enquiryBody(eventId, email) {
  return {
    slug: TENANT,
    eventId,
    meta: { elapsedMs: 60_000 },
    companyWebsite: "",
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
      contact: { name: "Mail Buyer", email, phone: "" },
    },
  };
}

function countEscalations() {
  return stubRequests.filter(
    (entry) => entry.body?.to?.[0] === CONTACT_EMAIL &&
      String(entry.body?.subject ?? "").includes("[action needed]"),
  ).length;
}

// ---------------------------------------------------------------------------

async function seedTenant() {
  try {
    await sql`delete from leads where tenant_slug = ${TENANT}`;
    await sql`delete from customers where slug = ${TENANT}`;
  } catch (error) {
    if (error?.code !== "42P01") throw error;
  }
  await sql`
    insert into customers (slug, company_name, lead_recipient_email, config, enabled)
    values (${TENANT}, 'Verify Mail Ltd', 'inbox@verify-mail.example',
            '{"serviceAreas":"Manchester","services":"Office cleaning"}'::jsonb, true)
  `;
}

try {
  await seedTenant();
  console.log("\n[instance A: sending ENABLED]");
  const appA = await startApp({
    name: "phase3-enabled",
    port: PORT_A,
    env: {
      LEADS_DATABASE_URL: DB_URL,
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
      ASSISTANT_MODEL_ENABLED: "false",
      EMAIL_SENDING_ENABLED: "true",
      RESEND_API_KEY: "re_test_key",
      RESEND_BASE_URL: STUB_URL,
      RESEND_WEBHOOK_SECRET: WEBHOOK_SECRET,
      EMAIL_RETRY_DELAYS_MS: "60,60,60",
      EMAIL_DISPATCH_SECRET: "dispatch-secret",
    },
  });
  const baseA = `http://localhost:${PORT_A}`;

  console.log("\n[A1] happy lifecycle: pending -> sent");
  resetStub();
  const stored = await postJson(baseA, "/api/leads", enquiryBody("enq_p3-a1-happy", "buyer-a@example.co.uk"), {});
  checkEqual(stored.status, 201, "capture accepted while sending enabled");

  checkEqual(stubRequests.length, 1, "exactly one provider call for one enquiry");
  checkEqual(stubRequests[0]?.auth, "Bearer re_test_key", "provider called with the configured key");
  checkEqual(stubRequests[0]?.body?.from, "enquiries@linwick.co.uk", "sent FROM the brand address");
  checkEqual(stubRequests[0]?.body?.to?.[0], "inbox@verify-mail.example", "sent TO the tenant's inbox");
  checkEqual(stubRequests[0]?.body?.reply_to, "buyer-a@example.co.uk", "Reply-To points at the enquirer");
  check(!JSON.stringify(stubRequests[0]?.body ?? {}).includes("re_test"), "request carries no key material in its body");

  const [pendingRow] = await leadRows("enq_p3-a1-happy");
  checkEqual(pendingRow?.status ?? "", "pending", "row is PENDING awaiting delivery confirmation");
  check(typeof pendingRow?.provider_message_id === "string" && pendingRow.provider_message_id !== "", "provider id recorded");

  let wh = signedWebhook("email.delivered", { email_id: pendingRow.provider_message_id });
  checkEqual((await postWebhook(PORT_A, wh)).status, 200, "signed delivery webhook accepted");
  const [sentRow] = await leadRows("enq_p3-a1-happy");
  checkEqual(sentRow?.status ?? "", "sent", "webhook flips the row to SENT");
  check(sentRow?.delivered_at !== null && sentRow?.delivered_at !== undefined, "delivered_at stamped");

  // Replays and out-of-order events must change nothing.
  checkEqual((await postWebhook(PORT_A, wh)).status, 200, "replayed delivery webhook accepted again");
  checkEqual((await leadRows("enq_p3-a1-happy"))[0]?.status ?? "", "sent", "still SENT after replay");
  wh = signedWebhook("email.bounced", { email_id: pendingRow.provider_message_id });
  await postWebhook(PORT_A, wh);
  checkEqual((await leadRows("enq_p3-a1-happy"))[0]?.status ?? "", "sent", "a late bounce cannot un-send a delivered row");

  console.log("\n[A2] signature discipline");
  wh = signedWebhook("email.delivered", { email_id: "whatever" }, { corruptSignature: true });
  checkEqual((await postWebhook(PORT_A, wh)).status, 400, "forged signature -> 400");
  wh = signedWebhook("email.delivered", { email_id: "whatever" }, { timestampOffsetSeconds: -3600 });
  checkEqual((await postWebhook(PORT_A, wh)).status, 400, "stale timestamp -> 400");
  wh = signedWebhook("email.opened", { email_id: "whatever" });
  const opened = await postWebhook(PORT_A, wh);
  checkEqual(opened.status, 200, "unsubscribed event type -> 200");
  checkEqual(opened.body?.handled ?? true, false, "and acknowledged as unhandled");

  console.log("\n[A3] transient failures exhaust retries, then escalate");
  resetStub();
  stubMode = "fail500";
  await postJson(baseA, "/api/leads", enquiryBody("enq_p3-a3-trans", "buyer-c@example.co.uk"), {});
  const [retryRow] = await leadRows("enq_p3-a3-trans");
  checkEqual(retryRow?.status ?? "", "pending", "transient failure leaves the row pending");
  checkEqual(Number(retryRow?.retry_count ?? 0), 1, "first attempt consumed one retry slot");
  check(retryRow?.next_retry_at !== null && retryRow?.next_retry_at !== undefined, "retry scheduled");
  checkEqual(countEscalations(), 0, "no escalation yet");

  // Three delays configured -> three attempts total -> the third failure
  // ends it. The route also sweeps due retries after each response now (the
  // Hobby-plan cron fix), so WHICH driver lands each attempt is timing
  // dependent; what must hold regardless is the budget: exactly three send
  // calls for this tenant's address, and exactly one escalation.
  const sweep = async () =>
    fetch(`${baseA}/api/email-dispatch`, {
      method: "POST",
      headers: { authorization: "Bearer dispatch-secret" },
    });
  await new Promise((r) => setTimeout(r, 120));
  await sweep();
  await new Promise((r) => setTimeout(r, 120));
  const secondSweep = await sweep();
  const secondSweepBody = await secondSweep.json();
  check(secondSweepBody?.escalated === 1 || countEscalations() === 1, "sweep reports the escalation");
  const [undeliverableRow] = await leadRows("enq_p3-a3-trans");
  checkEqual(undeliverableRow?.status ?? "", "undeliverable", "row becomes UNDELIVERABLE once retries are exhausted");
  check(String(undeliverableRow?.last_error ?? "").includes("500"), "last error recorded");
  checkEqual(countEscalations(), 1, "exactly one escalation email went to CONTACT_EMAIL");

  // Let any trailing post-response sweep settle before counting.
  await new Promise((r) => setTimeout(r, 400));
  const sendCallsForTenant = stubRequests.filter(
    (entry) => entry.body?.to?.[0] === "inbox@verify-mail.example",
  ).length;
  checkEqual(sendCallsForTenant, 3, "retry budget capped at exactly three provider calls in total");
  stubMode = "ok";

  console.log("\n[A4] permanent failures never retry");
  resetStub();
  stubMode = "fail400";
  await postJson(baseA, "/api/leads", enquiryBody("enq_p3-a4-perma", "buyer-d@example.co.uk"), {});
  const [permanentRow] = await leadRows("enq_p3-a4-perma");
  checkEqual(permanentRow?.status ?? "", "undeliverable", "a 400 goes straight to UNDELIVERABLE");
  checkEqual(Number(permanentRow?.retry_count ?? 0), 0, "without spending any retry budget");
  checkEqual(countEscalations(), 1, "with one escalation");
  stubMode = "ok";

  console.log("\n[A5] provider-reported bounce escalates");
  resetStub();
  await postJson(baseA, "/api/leads", enquiryBody("enq_p3-a5-bounc", "buyer-e@example.co.uk"), {});
  const [bounceRow] = await leadRows("enq_p3-a5-bounc");
  wh = signedWebhook("email.bounced", { email_id: bounceRow.provider_message_id });
  checkEqual((await postWebhook(PORT_A, wh)).status, 200, "bounce webhook accepted");
  checkEqual((await leadRows("enq_p3-a5-bounc"))[0]?.status ?? "", "undeliverable", "row flips to UNDELIVERABLE");
  checkEqual(countEscalations(), 1, "escalation sent to CONTACT_EMAIL");

  console.log("\n[A6] sweep route authentication");
  checkEqual(
    (await fetch(`${baseA}/api/email-dispatch`, { method: "POST" })).status,
    401,
    "missing bearer -> 401",
  );
  checkEqual(
    (
      await fetch(`${baseA}/api/email-dispatch`, {
        method: "POST",
        headers: { authorization: "Bearer wrong-secret" },
      })
    ).status,
    401,
    "wrong bearer -> 401",
  );

  await appA.stop();

  console.log("\n[instance B: flag OFF beats credentials]");
  resetStub();
  const appB = await startApp({
    name: "phase3-disabled",
    port: PORT_B,
    env: {
      LEADS_DATABASE_URL: DB_URL,
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
      ASSISTANT_MODEL_ENABLED: "false",
      // The trap: a live-looking key pointed at the stub, but the master
      // flag absent. Nothing may be sent. The secrets below are blanked
      // explicitly because a developer .env.local can otherwise supply them
      // (the phase 1 lesson with STRIPE keys, again).
      EMAIL_SENDING_ENABLED: "",
      RESEND_API_KEY: "re_test_key",
      RESEND_BASE_URL: STUB_URL,
      RESEND_WEBHOOK_SECRET: "",
      EMAIL_DISPATCH_SECRET: "",
      CRON_SECRET: "",
      EMAIL_RETRY_DELAYS_MS: "60,60,60",
    },
  });
  const baseB = `http://localhost:${PORT_B}`;

  const disabledStored = await postJson(baseB, "/api/leads", enquiryBody("enq_p3-b1-disab", "buyer-off@example.co.uk"), {});
  checkEqual(disabledStored.status, 201, "capture accepted while sending disabled");
  checkEqual(stubRequests.filter((r) => r.body?.to?.[0] !== CONTACT_EMAIL).length, 0, "ZERO requests reached the provider");
  checkEqual((await leadRows("enq_p3-b1-disab"))[0]?.status ?? "", "captured", "row stays CAPTURED, untouched by the mail seam");

  const bWebhookNoSecret = await postWebhook(PORT_B, signedWebhook("email.delivered", {}));
  checkEqual(bWebhookNoSecret.status, 503, "webhook route without its secret -> 503 (fail closed)");
  checkEqual(
    (await fetch(`${baseB}/api/email-dispatch`, { method: "POST", headers: { authorization: "Bearer x" } })).status,
    503,
    "dispatch route without configuration -> 503 (fail closed)",
  );

  await appB.stop();
} finally {
  stubServer.close();
  await sql.end();
}

process.exitCode = summarise("phase 3") ? 0 : 1;
