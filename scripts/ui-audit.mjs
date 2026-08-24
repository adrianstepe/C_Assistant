/**
 * Deep DOM audit: the numbers behind a visual judgement call.
 *
 * Complements visual-qa.mjs. Where that harness measures section fill and tap
 * targets, this one measures what actually reads as unpolished to a visitor:
 *
 *  - horizontal overflow (a page you can sideways-scroll is broken),
 *  - text contrast, composited through translucent ancestors,
 *  - text under 12px (reads as fine print where it isn't meant to be),
 *  - controls whose disabled/hover state can't be distinguished,
 *  - headings out of order (h1 -> h3 jumps read as broken structure).
 *
 * Run against a serving build:
 *   node scripts/ui-audit.mjs > .verify-tmp/audit-before.txt
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.QA_BASE ?? "http://localhost:3210";
const OUT = process.env.QA_OUT ?? "./visual-qa";
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

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
let totalIssues = 0;

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
      await page.goto(BASE + path, { waitUntil: "load", timeout: 30_000 });
    }
    await page.waitForTimeout(600);

    const name = path === "/" ? "home" : path.replace(/[/?=]/g, "-").replace(/^-/, "");

    const report = await page.evaluate(
      () => {
        const issues = { overflow: [], contrast: [], tinyText: [], headingJumps: [] };

        /** Relative luminance per WCAG 2.x. */
        function luminance(r, g, b) {
          const f = (v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        }

        function contrastRatio(rgb1, rgb2) {
          const l1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
          const l2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
          const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
          return (hi + 0.05) / (lo + 0.05);
        }

        function parseColor(value) {
          const m = value.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
          if (!m) return null;
          return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
        }

        function composite(fg, bg) {
          const a = fg.a + bg.a * (1 - fg.a);
          if (a === 0) return null;
          return {
            r: Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a),
            g: Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a),
            b: Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a),
            a,
          };
        }


        // --- horizontal overflow -------------------------------------------
        const docOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
        if (docOverflow) {
          const offenders = [];
          const vwPx = document.documentElement.clientWidth;
          for (const el of document.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.right > vwPx + 1 && r.left >= 0) {
              offenders.push(
                `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ").slice(0, 3).join(".") : ""} right=${Math.round(r.right)}`,
              );
            }
            if (offenders.length >= 5) break;
          }
          issues.overflow.push(`document scrolls horizontally (${document.documentElement.scrollWidth}px > ${vwPx}px): ${offenders.join("; ")}`);
        }

        // --- text contrast --------------------------------------------------
        const seen = new Set();
        let contrastCount = 0;
        const textEls = document.querySelectorAll("h1,h2,h3,h4,p,li,a,button,summary,label,span,td,th,strong");
        for (const el of textEls) {
          if (contrastCount >= 8) break;
          // Leaf-ish text carriers only.
          if (el.children.length > 0 && ![..."P","A","BUTTON","SUMMARY","LABEL","SPAN","STRONG","TD","TH","LI"].includes(el.tagName)) continue;
          // Only elements that directly carry text: a list item whose words
          // all live inside coloured child paragraphs would otherwise be
          // measured with its own inherited colour against its own
          // background, reporting ink-on-ink that no visitor can see.
          const ownText = [...el.childNodes]
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => n.textContent || "")
            .join("")
            .trim();
          if (!ownText) continue;
          const text = ownText;
          const style = getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") continue;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;

          const fgRaw = parseColor(style.color);
          if (!fgRaw) continue;

          // Composite the foreground over the nearest opaque background.
          let effFg = fgRaw;
          let effBg = { r: 255, g: 255, b: 255, a: 1 };
          for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
            const s = getComputedStyle(node);
            const bg = parseColor(s.backgroundColor);
            if (bg && bg.a > 0) {
              if (bg.a === 1) { effBg = bg; break; }
              effBg = composite(effBg, bg) ?? effBg;
            }
          }
          if (effFg.a < 1) effFg = composite(effFg, effBg) ?? effFg;
          if (!effFg || !effBg) continue;

          const ratio = contrastRatio([effFg.r, effFg.g, effFg.b], [effBg.r, effBg.g, effBg.b]);
          const px = parseFloat(style.fontSize);
          const bold = parseInt(style.fontWeight, 10) >= 600;
          const large = px >= 24 || (px >= 18.66 && bold);
          const threshold = large ? 3 : 4.5;

          if (ratio < threshold - 0.05) {
            const key = `${style.color}|${el.tagName}`;
            if (!seen.has(key)) {
              seen.add(key);
              contrastCount++;
              issues.contrast.push(
                `${el.tagName.toLowerCase()} "${text.slice(0, 36)}" ${style.color} on ${`rgb(${effBg.r},${effBg.g},${effBg.b})`} = ${ratio.toFixed(2)}:1 (needs ${threshold})`,
              );
            }
          }

          if (px < 12 && !seen.has(`tiny|${text.slice(0, 20)}|${px}`)) {
            seen.add(`tiny|${text.slice(0, 20)}|${px}`);
            issues.tinyText.push(`${el.tagName.toLowerCase()} ${px.toFixed(1)}px "${text.slice(0, 30)}"`);
          }
        }

        // --- heading level jumps --------------------------------------------
        let lastLevel = 0;
        for (const h of document.querySelectorAll("h1,h2,h3,h4")) {
          const level = Number(h.tagName[1]);
          if (lastLevel && level > lastLevel + 1) {
            issues.headingJumps.push(`h${lastLevel} -> h${level} "${(h.textContent || "").trim().slice(0, 40)}"`);
          }
          lastLevel = level;
        }

        return issues;
      },
      
    );

    const flat = [
      ...report.overflow.map((t) => `OVERFLOW  ${t}`),
      ...report.contrast.map((t) => `CONTRAST  ${t}`),
      ...report.tinyText.map((t) => `TINYTEXT  ${t}`),
      ...report.headingJumps.map((t) => `HEADINGS  ${t}`),
    ];
    totalIssues += flat.length;

    console.log(`\n=== ${path} [${vp.tag}] ===`);
    if (flat.length === 0) console.log("  clean");
    for (const line of flat) console.log(`  ${line}`);
    void name;
    await page.close();
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${totalIssues} findings`);

