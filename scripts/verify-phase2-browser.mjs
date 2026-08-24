/**
 * Phase 2 browser verification: the hosted capture page, driven like a human
 * at both viewports, all eight answers included.
 *
 *   node scripts/verify-phase2-browser.mjs \
 *     --db-url "postgres://linwick:linwick@127.0.0.1:54329/linwick" [--port 3331]
 *
 * Proven here:
 *   - a seeded tenant's page renders, names the right company, and runs the
 *     full seven-slot conversation plus the contact card at 1440x900 AND
 *     390x844
 *   - completing the conversation POSTs to /api/leads and gets a 201
 *   - the enquiry lands in the database attributed to the tenant
 *   - an unknown slug serves 404 with no config leak
 *   - the public /demo still works after the component changes
 *
 * Screenshots land in .verify-tmp/ for eyeballing alongside visual-qa.mjs.
 */
import { parseArgs } from "node:util";
import postgres from "postgres";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { check, checkEqual, summarise, startApp } from "./lib/harness.mjs";

const args = parseArgs({
  options: {
    "db-url": { type: "string" },
    port: { type: "string", default: "3331" },
  },
});
const DB_URL = args.values["db-url"];
if (!DB_URL) {
  console.error("Usage: node scripts/verify-phase2-browser.mjs --db-url <postgres://...>");
  process.exit(2);
}
const PORT = Number(args.values.port);
// `localhost`, not 127.0.0.1: Next 16 blocks dev chunks it considers
// cross-origin, and a numeric-host page load counts. Browsing via the name
// keeps hydration alive; this matters only in dev, which is all these
// verifications ever run against.
const base = `http://localhost:${PORT}`;
const TENANT = "verify-cleaners";

const sql = postgres(DB_URL, { max: 1 });
mkdirSync(join(process.cwd(), ".verify-tmp"), { recursive: true });

/** The scripted enquirer. One message can answer several slots at once -
 *  that is the point being demonstrated. */
const ANSWERS = [
  "I need office cleaning in Manchester",
  "About 1,500 sq ft",
  "3 times a week",
  "Evenings",
  "No, not currently",
  "Just general cleaning",
];

async function seed() {
  try {
    await sql`delete from leads where tenant_slug = ${TENANT}`;
    await sql`delete from customers where slug = ${TENANT}`;
  } catch (error) {
    if (error?.code !== "42P01") throw error;
  }
  await sql`
    insert into customers (slug, company_name, lead_recipient_email, config, enabled)
    values (${TENANT}, 'Verify Cleaners Ltd', 'leads@verify-cleaners.example',
            '{"serviceAreas":"Manchester","services":"Office cleaning"}'::jsonb, true)
  `;
}

async function rowsForEmail(email) {
  return await sql`
    select * from leads
    where kind = 'enquiry' and tenant_slug = ${TENANT}
      and contact_email = ${email}
  `;
}

/** With sending disabled (the default), rows are stored as `captured`.
 *  Phase 3 introduces the `pending`/`sent`/`failed` lifecycle behind the
 *  EMAIL_SENDING_ENABLED flag; this expectation flips with it. */
const EXPECTED_STATUS_WITH_SENDING_OFF = "captured";

/**
 * Sends one customer message and waits for the assistant to settle.
 *
 * The readiness gate is the component's own focus-return effect: only a
 * hydrated, idle conversation focuses the message box. Waiting on that (not
 * merely on the input existing) is what keeps this from typing into the
 * server-rendered markup before React has attached its listeners.
 */
async function sendAndSettle(page, tag, text) {
  await page.waitForFunction(
    () => document.activeElement?.id === "demo-message",
    undefined,
    { timeout: 30_000 },
  );
  const before = await page.locator('[role="log"] > div').count();
  await page.fill("#demo-message", text);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.waitForFunction(
    ([count]) => {
      const log = document.querySelector('[role="log"]');
      if (!log || log.children.length <= count) return false;
      // Settled = replied AND either the handover to the contact card has
      // happened (composer gone) or the composer took focus back. Composer
      // state is the only reliable signal here: bubble CSS classes persist
      // after their entry animation ends.
      if (document.getElementById("contact-name") instanceof HTMLInputElement) {
        return true;
      }
      const input = document.getElementById("demo-message");
      return (
        input instanceof HTMLInputElement &&
        !input.disabled &&
        document.activeElement === input
      );
    },
    [before],
    { timeout: 45_000 },
  );
  check(true, `[${tag}] answered: ${text}`);
}

try {
  await seed();
  const app = await startApp({
    name: "phase2-browser",
    port: PORT,
    env: {
      LEADS_DATABASE_URL: DB_URL,
      ASSISTANT_MODEL_ENABLED: "false",
      EMAIL_SENDING_ENABLED: "",
    },
  });

  const browser = await chromium.launch();

  const VIEWPORTS = [
    { width: 1440, height: 900, tag: "desk" },
    { width: 390, height: 844, tag: "mob" },
  ];

  for (const vp of VIEWPORTS) {
    console.log(`\n[${vp.tag}] ${vp.width}x${vp.height}`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    const captureStatuses = [];
    page.on("response", (response) => {
      if (
        response.url().endsWith("/api/leads") &&
        response.request().method() === "POST"
      ) {
        captureStatuses.push(response.status());
      }
    });

    const email = `browser-${vp.tag}@example.co.uk`;
    await page.goto(`${base}/c/${TENANT}`, { waitUntil: "networkidle" });
    check(
      (await page.textContent("h1"))?.includes("Verify Cleaners Ltd") ?? false,
      `[${vp.tag}] page names the tenant company`,
    );

    for (const answer of ANSWERS) {
      await sendAndSettle(page, vp.tag, answer);
    }

    // Contact card replaces the composer for the eighth answer.
    await page.waitForSelector("#contact-name", { timeout: 20_000 });
    await page.fill("#contact-name", "Browser Tester");
    await page.fill("#contact-email", email);
    await page.getByRole("button", { name: "Send details" }).click();

    // Hosted capture pages address the enquirer ("Your enquiry"); the
    // seller-facing "Qualified enquiry" heading is demo-only since the
    // uiux-and-fulfilment-check rework of LeadSummaryCard.
    await page.waitForSelector("text=Your enquiry", { timeout: 30_000 });
    check(true, `[${vp.tag}] completed all eight answers to the lead card`);
    await page.screenshot({
      path: join(".verify-tmp", `tenant-complete-${vp.tag}.png`),
      fullPage: true,
    });

    await page.waitForTimeout(1_500);
    checkEqual(captureStatuses.length, 1, `[${vp.tag}] exactly one capture POST fired`);
    checkEqual(captureStatuses[0], 201, `[${vp.tag}] capture POST returned 201`);

    const stored = await rowsForEmail(email);
    check(stored.length >= 1, `[${vp.tag}] enquiry found in the database`);
    check(
      stored[0] !== undefined &&
        typeof stored[0].payload === "object" &&
        stored[0].payload !== null,
      `[${vp.tag}] row carries the structured payload`,
    );
    checkEqual(
      stored[0]?.status ?? "",
      EXPECTED_STATUS_WITH_SENDING_OFF,
      `[${vp.tag}] row status reflects sending-disabled mode`,
    );

    await context.close();
  }

  console.log("\n[unknown]");
  const context = await browser.newContext();
  const page = await context.newPage();
  const response = await page.goto(`${base}/c/never-a-tenant`, { waitUntil: "domcontentloaded" });
  checkEqual(response?.status() ?? -1, 404, "unknown slug serves 404");
  const body = (await page.textContent("body")) ?? "";
  check(!body.includes("Verify Cleaners Ltd"), "404 leaks no other tenant's config");
  await context.close();

  console.log("\n[demo regression]");
  const demoContext = await browser.newContext();
  const demoPage = await demoContext.newPage();
  await demoPage.goto(`${base}/demo`, { waitUntil: "networkidle" });
  check(
    ((await demoPage.textContent("body")) ?? "").includes("Meridian Cleaning"),
    "public demo still names the fictional company",
  );
  await sendAndSettle(demoPage, "demo", ANSWERS[0]);
  check(true, "demo accepts a first message and replies");
  await demoContext.close();

  await browser.close();
  await app.stop();
} finally {
  await sql.end();
}

process.exitCode = summarise("phase 2 (browser)") ? 0 : 1;
