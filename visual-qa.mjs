/**
 * Visual QA harness.
 *
 * Screenshots every public page at desktop, tablet and mobile, then measures
 * the things that are cheap to get wrong and expensive to notice: how much of
 * each section is empty, how much horizontal width is dead, and every
 * interactive target under the 44px floor.
 *
 * The point is to diff the numbers before and after a change. Design work
 * without a screenshot loop is guessing.
 *
 * Origin: Adrians' untracked visual-qa.mjs in the main checkout. This copy
 * lives on the stealth-ox/uiux-and-fulfilment-check branch with three
 * additions: a tablet viewport, the checkout/security routes, and optional
 * Basic-auth coverage of /admin via QA_ADMIN_USER / QA_ADMIN_PASS.
 *
 * Setup, once:
 *   npm i -D playwright && npx playwright install chromium
 *
 * Run (with the production build serving):
 *   node visual-qa.mjs
 *
 * Output: ./visual-qa/*.png and a printed report. Pipe it to a file to diff:
 *   node visual-qa.mjs > visual-qa/before.txt
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.QA_BASE ?? "http://localhost:3210";
const OUT = "./visual-qa";
const PAGES = [
  "/",
  "/pricing",
  "/demo",
  "/security",
  "/privacy",
  "/terms",
  "/checkout/success?preview=1",
  "/checkout/cancelled",
];
const ADMIN_USER = process.env.QA_ADMIN_USER ?? "";
const ADMIN_PASS = process.env.QA_ADMIN_PASS ?? "";
if (ADMIN_USER && ADMIN_PASS) PAGES.push("/admin/leads");
const VIEWPORTS = [
  { w: 1440, h: 900, tag: "desk" },
  { w: 768, h: 1024, tag: "tab" },
  { w: 390, h: 844, tag: "mob" },
];

/** Below this, a section reads as padding with something in it. */
const FILL_FLOOR = 0.82;
/**
 * Unused viewport width. The container gutters put a floor of about 0.24 under
 * every full-width section at 1440px, so 0.24 is normal and 0.30 is a hole.
 */
const DEAD_WIDTH_CEILING = 0.3;
/** Platform minimum for a comfortable tap target. */
const TARGET_MIN = 44;

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
let failures = 0;

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    ...(ADMIN_USER && ADMIN_PASS
      ? { httpCredentials: { username: ADMIN_USER, password: ADMIN_PASS } }
      : {}),
  });

  for (const path of PAGES) {
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 30_000 });
    } catch {
      // networkidle never settling (long-polling, stray request) should not
      // lose the screenshot: fall back to load + settle.
      await page.goto(BASE + path, { waitUntil: "load", timeout: 30_000 });
    }
    await page.waitForTimeout(900);

    const name = path === "/" ? "home" : path.replace(/[/?=]/g, "-").replace(/^-/, "");
    await page.screenshot({ path: `${OUT}/${name}-${vp.tag}.png`, fullPage: true });

    const data = await page.evaluate(
      ({ vw, targetMin }) => {
        const sections = [];
        const small = [];

        for (const s of document.querySelectorAll("section")) {
          const r = s.getBoundingClientRect();
          if (r.height < 40) continue;

          let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
          for (const el of s.querySelectorAll("h1,h2,h3,h4,p,li,a,button,img,svg,input,textarea")) {
            const rr = el.getBoundingClientRect();
            if (rr.width < 2 || rr.height < 2) continue;
            const hasContent =
              (el.textContent || "").trim() ||
              ["IMG", "SVG", "INPUT", "TEXTAREA"].includes(el.tagName);
            if (!hasContent) continue;
            left = Math.min(left, rr.left);
            right = Math.max(right, rr.right);
            top = Math.min(top, rr.top);
            bottom = Math.max(bottom, rr.bottom);
          }
          if (left === Infinity) continue;

          sections.push({
            label: (s.querySelector("h1,h2")?.textContent || "(unlabelled)").trim().slice(0, 44),
            height: Math.round(r.height),
            fill: +((bottom - top) / r.height).toFixed(2),
            deadWidth: +(1 - (right - left) / vw).toFixed(2),
          });
        }

        for (const el of document.querySelectorAll("a,button,summary,input,[role=button]")) {
          const rr = el.getBoundingClientRect();
          if (rr.width < 2 || rr.height < 2) continue;
          // An inline link inside running prose is a word, not a control. WCAG
          // exempts these, and flagging them buries the targets that matter.
          const inline = getComputedStyle(el).display === "inline";
          const inProse = ["P", "LI", "SPAN", "STRONG", "EM"].includes(el.parentElement?.tagName);
          if (inline && inProse) continue;
          if (rr.height < targetMin) {
            small.push({
              text: (el.textContent || el.getAttribute("aria-label") || "(no label)").trim().slice(0, 30),
              height: Math.round(rr.height),
            });
          }
        }

        return { sections, small, docHeight: document.body.scrollHeight };
      },
      { vw: vp.w, targetMin: TARGET_MIN },
    );

    const screens = (data.docHeight / vp.h).toFixed(1);
    console.log(`\n=== ${path}  [${vp.tag} ${vp.w}x${vp.h}] ===`);
    console.log(`height ${data.docHeight}px  (${screens} screens of scroll)`);

    if (data.sections.length) {
      console.log("  section                                       height   fill   dead-w");
      for (const s of data.sections) {
        const bad = s.fill < FILL_FLOOR || s.deadWidth > DEAD_WIDTH_CEILING;
        const flag = bad
          ? s.fill < FILL_FLOOR
            ? "  <-- under fill floor"
            : "  <-- dead width"
          : "";
        if (bad) failures++;
        console.log(
          `  ${s.label.padEnd(44)} ${String(s.height).padStart(6)}  ${s.fill.toFixed(2)}   ${s.deadWidth.toFixed(2)}${flag}`,
        );
      }
    }

    const unique = [...new Map(data.small.map((t) => [t.text + t.height, t])).values()];
    if (unique.length) {
      failures += unique.length;
      console.log(`  ${unique.length} targets under ${TARGET_MIN}px:`);
      for (const t of unique) console.log(`    ${String(t.height).padStart(3)}px  ${t.text}`);
    }

    await page.close();
  }
  await ctx.close();
}

await browser.close();
console.log(`\nScreenshots in ${OUT}/`);
console.log(failures === 0 ? "PASS" : `${failures} issues above the floor`);
process.exitCode = failures === 0 ? 0 : 1;
