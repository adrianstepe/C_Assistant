/**
 * End-to-end paying-customer journey, walked for real against the local rig.
 *
 *   node scripts/journey-check.mjs
 *
 * Walks: marketing home → pricing → checkout (dev preview) → onboarding form
 * → inactive tenant row in Postgres → manual activation (the documented step)
 * → hosted capture page conversation → enquiry stored → visible in
 * /admin/leads. Also proves the negative paths: disabled slug 404s, webhook
 * endpoint fails closed without credentials.
 *
 * Every assertion is a hard check; the script exits non-zero on the first
 * broken promise. Screenshots land in .verify-tmp/journey/.
 */
import { parseArgs } from "node:util";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { chromium } from "playwright";

const args = parseArgs({
  options: {
    "db-url": { type: "string", default: "postgres://linwick:linwick@127.0.0.1:54339/linwick" },
    base: { type: "string", default: "http://localhost:3210" },
    admin: { type: "string", default: "" }, // "user:pass" for /admin
  },
});
const DB_URL = args.values["db-url"];
const BASE = args.values.base;
const [ADMIN_USER, ADMIN_PASS] = args.values.admin.split(":");

const outDir = join(process.cwd(), ".verify-tmp", "journey");
mkdirSync(outDir, { recursive: true });

let failures = 0;
function check(ok, label) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures++;
}

const sql = postgres(DB_URL, { max: 1 });

// Rerunnable: clear previous runs of this journey so slug generation and
// row counts start from zero every time.
await sql`delete from leads where tenant_slug like 'journey-check-cleaning%'`;
await sql`delete from customers where slug like 'journey-check-cleaning%'`;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  ...(ADMIN_USER && ADMIN_PASS
    ? { httpCredentials: { username: ADMIN_USER, password: ADMIN_PASS } }
    : {}),
});
const page = await ctx.newPage();

// --- 1. marketing home -------------------------------------------------------
await page.goto(BASE + "/", { waitUntil: "networkidle" });
check((await page.title()).includes("Linwick"), "home renders with Linwick title");
check(await page.getByRole("link", { name: /see the demo/i }).first().isVisible(), "hero demo CTA visible");

// --- 2. nav to pricing, start checkout --------------------------------------
await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Pricing" }).click();
await page.waitForURL("**/pricing");
await page.screenshot({ path: join(outDir, "01-pricing.png"), fullPage: true });
const buy = page.getByRole("button", { name: /get set up/i });
check(await buy.isVisible(), "pricing page shows the buy button");
await buy.click();

// Dev-preview mode (no Stripe keys locally) lands straight on the success page.
await page.waitForURL("**/checkout/success**", { timeout: 15_000 });
check(true, "checkout redirected to /checkout/success");

// --- 3. onboarding form -------------------------------------------------------
await page.waitForSelector("#onboarding-companyName");
await page.fill("#onboarding-companyName", "Journey Check Cleaning Ltd");
await page.fill("#onboarding-website", "journeycheck.example.co.uk");
await page.fill("#onboarding-contactName", "Jo Journey");
await page.fill("#onboarding-email", "jo@journeycheck.example");
await page.fill("#onboarding-phone", "0161 496 0000");
// leadEmail left blank: must default to the contact email server-side.
await page.fill("#onboarding-serviceAreas", "Salford, Trafford");
await page.fill("#onboarding-services", "Office cleaning, washroom services");
await page.fill("#onboarding-notes", "Evening access only after 6pm.");

// The intake drops submissions faster than 4s; a real customer reads first.
await page.waitForTimeout(4_500);
await page.screenshot({ path: join(outDir, "02-onboarding-filled.png"), fullPage: true });
await page.getByRole("button", { name: /continue/i }).click();

await page.waitForSelector("text=Setup details received", { timeout: 10_000 });
const panelText = await page.locator("body").innerText();
const slugMatch = panelText.match(/linwick\.co\.uk\/c\/([a-z0-9-]+)/);
const slug = slugMatch?.[1] ?? "";
check(slug !== "", `setup accepted with slug "${slug}"`);
await page.screenshot({ path: join(outDir, "03-setup-received.png"), fullPage: true });

// --- 4. what actually got stored ---------------------------------------------
const draftRows = await sql`
  select slug, company_name, enabled, contact_name,
         config->>'serviceAreas' as areas, lead_recipient_email
  from customers where slug = ${slug}
`;
check(draftRows.length === 1, "customers row exists for the new tenant");
check(draftRows[0]?.enabled === false, "new tenant row is NOT live before a human acts");
// Raw SQL returns snake_case columns; map deliberately.
check(draftRows[0]?.lead_recipient_email === "jo@journeycheck.example", "blank 'send enquiries to' defaulted to contact email");
const auditRows = await sql`
  select kind, status from leads where tenant_slug = ${slug} and kind = 'setup_request'
`;
check(auditRows.length === 1 && auditRows[0].status === "received", "setup_request audit row stored");

// --- 5. the manual activation step (documented SQL) --------------------------
await sql`
  update customers set enabled = true, updated_at = now() where slug = ${slug}
`;
console.log(`INFO  manual activation run for ${slug}`);

// --- 6. hosted capture page: full conversation --------------------------------
await page.goto(`${BASE}/c/${slug}`, { waitUntil: "networkidle" });
check(
  (await page.locator("h1").innerText()).includes("Journey Check Cleaning Ltd"),
  "capture page renders the tenant by name",
);

// Drive the whole conversation through the suggested-answer chips, as most
// mobile visitors do, until the contact card replaces the composer.
let guard = 0;
while (!(await page.isVisible("#contact-name")) && guard < 24) {
  const chip = page.locator('button[type="button"].min-h-11:not([disabled])').first();
  if ((await chip.count()) === 0) break;
  await chip.click();
  // Wait out the assistant's reply (typing dots gone, next controls live).
  await page
    .waitForFunction(
      () =>
        !document.querySelector(".animate-typing-dot") &&
        (document.querySelector("#contact-name") ||
          [...document.querySelectorAll('button[type="button"].min-h-11')].some(
            (b) => !b.disabled,
          )),
      undefined,
      { timeout: 10_000 },
    )
    .catch(() => {});
  guard++;
}
check(await page.isVisible("#contact-name"), `conversation reached the contact card (${guard} turns)`);

await page.fill("#contact-name", "Pat Prospect");
await page.fill("#contact-company", "Prospect Manufacturing");
await page.fill("#contact-email", "pat@prospect-manufacturing.example");
await page.fill("#contact-phone", "0161 496 0100");
await page.getByRole("button", { name: /send details/i }).click();

// The capture-aware completion pill, added this branch: proof of delivery.
await page.waitForSelector("text=Sent to", { timeout: 10_000 });
const completionText = await page.locator("body").innerText();
check(completionText.includes(`Sent to Journey Check Cleaning Ltd`), "completion shows the enquiry was sent to the business");
const refMatch = completionText.match(/Ref (ENQ-[0-9]{5})/);
check(refMatch !== null, `completion carries an enquiry reference`);
const reference = refMatch?.[1] ?? "(none)";
console.log(`INFO  enquiry reference ${reference}`);
await page.screenshot({ path: join(outDir, "04-capture-complete.png"), fullPage: true });

// And it is genuinely in the datastore.
const enquiryRows = await sql`
  select kind, status, summary, contact_email, payload->>'reference' as ref
  from leads where tenant_slug = ${slug} and kind = 'enquiry'
`;
check(enquiryRows.length === 1, "enquiry row stored exactly once");
check(enquiryRows[0]?.status === "captured" || enquiryRows[0]?.status === "pending" || enquiryRows[0]?.status === "sent",
  `enquiry lifecycle state sane ("${enquiryRows[0]?.status}") — email sending is off here, so captured is expected`);
check(enquiryRows[0]?.contact_email === "pat@prospect-manufacturing.example", "enquiry carries the enquirer's email");

// --- 7. admin sees both sides -------------------------------------------------
await page.goto(`${BASE}/admin/leads`, { waitUntil: "networkidle" });
const adminText = await page.locator("body").innerText();
check(adminText.includes(slug), "admin lists the new tenant slug");
check(adminText.includes("New enquiry for Journey Check Cleaning Ltd"), "admin lists the stored enquiry");
await page.screenshot({ path: join(outDir, "05-admin-leads.png"), fullPage: true });

// --- 8. negative paths ---------------------------------------------------------
const dead = await page.goto(`${BASE}/c/disabled-cleaners`);
check(dead?.status() === 404, "disabled tenant's capture page answers plain 404");

const webhookNoCreds = await fetch(`${BASE}/api/stripe/webhook`, {
  method: "POST",
  headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=x" },
  body: JSON.stringify({ id: "evt_probe" }),
});
check(webhookNoCreds.status === 503, `webhook without credentials answers 503 fail-closed (got ${webhookNoCreds.status})`);

await browser.close();
await sql.end();

console.log(failures === 0 ? "\nJOURNEY COMPLETE — every step held." : `\n${failures} journey steps FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
