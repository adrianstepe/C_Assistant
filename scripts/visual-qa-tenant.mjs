/**
 * Phase 2 visual QA: screenshots every affected page at both viewports so a
 * human (or the agent) can eyeball them.
 *
 *   node scripts/visual-qa-tenant.mjs [--db-url postgres://...] [--port 3341]
 *
 * Deliberately separate from Adrians' untracked visual-qa.mjs: his file is
 * his WIP with its own page list; this one covers exactly what phase 2
 * touched - the new /security page, the rewritten privacy sections, terms,
 * and a live tenant capture page - without editing his.
 */
import { parseArgs } from "node:util";
import postgres from "postgres";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { check, summarise, startApp } from "./lib/harness.mjs";

const args = parseArgs({
  options: {
    "db-url": { type: "string" },
    port: { type: "string", default: "3341" },
  },
});
const DB_URL = args.values["db-url"] ?? "";
const PORT = Number(args.values.port);
// See verify-phase2-browser.mjs: localhost keeps Next's dev-origin checks happy.
const base = `http://localhost:${PORT}`;
const TENANT = "verify-cleaners";

const sql = DB_URL ? postgres(DB_URL, { max: 1 }) : null;

const PAGES = [
  { path: "/", expect: 200 },
  { path: "/demo", expect: 200 },
  { path: "/pricing", expect: 200 },
  { path: "/security", expect: 200 },
  { path: "/privacy", expect: 200 },
  { path: "/terms", expect: 200 },
  { path: `/c/${TENANT}`, expect: 200 },
  { path: "/c/not-a-real-tenant", expect: 404 },
];

async function seed() {
  if (!sql) return;
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

try {
  await seed();
  const app = await startApp({
    name: "vqa",
    port: PORT,
    env: DB_URL ? { LEADS_DATABASE_URL: DB_URL } : {},
  });

  const outDir = join(process.cwd(), ".verify-tmp", "vqa");
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();

  for (const vp of [
    { width: 1440, height: 900, tag: "desk" },
    { width: 390, height: 844, tag: "mob" },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    for (const entry of PAGES) {
      const response = await page.goto(`${base}${entry.path}`, {
        waitUntil: "networkidle",
      });
      const status = response?.status() ?? 0;
      checkEqual(status, entry.expect, `${vp.tag} ${entry.path} -> ${entry.expect}`);
      const name = `${vp.tag}${entry.path === "/" ? "-home" : entry.path.replace(/\//g, "-")}.png`;
      await page.screenshot({ path: join(outDir, name), fullPage: true });
    }
    await context.close();
  }

  await browser.close();
  await app.stop();
  console.log(`\nScreenshots in ${outDir}`);
} finally {
  if (sql) await sql.end();
}

function checkEqual(actual, expected, label) {
  const ok = actual === expected;
  check(ok, `${label}${ok ? "" : ` (got ${actual})`}`);
}

process.exitCode = summarise("phase 2 (visual)") ? 0 : 1;
