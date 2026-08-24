/**
 * Shared plumbing for the verification scripts in this folder.
 *
 * Deliberately dependency-free apart from the `postgres` driver the
 * application itself uses. These scripts exercise the real application over
 * real HTTP against a real local Postgres — they are the verification, not a
 * substitute for it.
 *
 * Sandbox note: child processes are spawned with stdio pointed at files,
 * never pipes. A pipe-captured child fails under some sandboxes, and a file
 * is also what you want when a server refuses to start at 2am.
 */
import { spawn } from "node:child_process";
import { openSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..", "..");

// ---------------------------------------------------------------------------
// assertions

let passed = 0;
const failures = [];

/** Fails the run (records, does not throw) unless `condition` is truthy. */
export function check(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`  ok    ${label}`);
  } else {
    failures.push(label);
    console.error(`  FAIL  ${label}`);
  }
}

export function checkEqual(actual, expected, label) {
  const ok = actual === expected;
  check(
    ok,
    `${label}${ok ? "" : ` (got ${JSON.stringify(actual)}, wanted ${JSON.stringify(expected)})`}`,
  );
}

export function summarise(suite) {
  console.log("");
  if (failures.length === 0) {
    console.log(`PASS ${suite}: ${passed} checks passed.`);
    return true;
  }
  console.error(`FAIL ${suite}: ${failures.length} of ${passed + failures.length} checks failed:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  return false;
}

// ---------------------------------------------------------------------------
// http

/** POSTs JSON and returns { status, headers, body }. Never throws on status. */
export async function postJson(base, path, body, headers = {}) {
  const response = await fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    // Some error paths send plain text; leave parsed null.
  }
  return { status: response.status, headers: response.headers, body: parsed };
}

/** Waits until `probe()` returns truthy or the deadline passes; returns last value. */
export async function waitFor(probe, timeoutMs, everyMs = 500) {
  const deadline = Date.now() + timeoutMs;
  let value = await probe();
  while (!value && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, everyMs));
    value = await probe();
  }
  return value;
}

// ---------------------------------------------------------------------------
// next dev server

const LOG_DIR = join(REPO_ROOT, ".verify-tmp");

/**
 * Starts `next dev -p PORT` with extra environment variables.
 *
 * Returns { base, stop() }. Logs go to .verify-tmp/<name>.log — read that
 * file when a server seems stuck; nothing is piped.
 */
export async function startApp({ name, port, env = {} }) {
  mkdirSync(LOG_DIR, { recursive: true });
  const logPath = join(LOG_DIR, `${name}.log`);
  const logFd = openSync(logPath, "a");

  // Straight to Next's JS entry rather than `npm run dev`: spawning a .cmd
  // shim without a shell is rejected outright on Windows (spawn EINVAL), and
  // going through node itself keeps one process tree to stop.
  const child = spawn(
    process.execPath,
    [join(REPO_ROOT, "node_modules", "next", "dist", "bin", "next"), "dev", "-p", String(port)],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", logFd, logFd],
      windowsHide: true,
    },
  );

  const base = `http://127.0.0.1:${port}`;
  console.log(`  .. starting ${name} on ${base} (log: ${logPath})`);

  const up = await waitFor(async () => {
    try {
      const response = await fetch(`${base}/api/health`);
      return response.ok ? base : false;
    } catch {
      return false;
    }
  }, 120_000);

  if (!up) {
    child.kill();
    throw new Error(`${name} never became healthy; see ${logPath}`);
  }

  let stopped = false;
  return {
    base,
    async stop() {
      if (stopped) return;
      stopped = true;
      if (process.platform === "win32") {
        // npm wraps node in layers; kill the whole tree, not just the shell.
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
      } else {
        child.kill("SIGTERM");
      }
      // Wait for exit before the caller boots another instance against the
      // same directory: Next 16 allows only one dev server per project.
      await new Promise((resolveClose) => {
        const timer = setTimeout(resolveClose, 15_000);
        child.once("close", () => {
          clearTimeout(timer);
          resolveClose();
        });
      });
    },
  };
}

// ---------------------------------------------------------------------------
// stripe fixture signing

import { createHmac } from "node:crypto";

/**
 * Signs a payload exactly as Stripe's webhook delivery does:
 * `t=<unix seconds>,v1=<hex hmac-sha256(secret, "<t>.<payload>")>`.
 *
 * This is the same construction `stripe trigger` puts on the wire, done
 * locally so a replay needs no network and no dashboard state.
 */
export function signStripePayload(payload, secret, timestampSeconds) {
  const t = timestampSeconds ?? Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

/** Builds a signed checkout.session.completed fixture with a stable event id. */
export function stripeCheckoutFixture({ eventId, email, paid = true }) {
  const payload = JSON.stringify({
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
        subscription: "sub_test_fixture",
      },
    },
  });
  return payload;
}
