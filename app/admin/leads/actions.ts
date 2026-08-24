"use server";

import { revalidatePath } from "next/cache";
import { readLeadsDatabaseConfig } from "@/lib/db/config";
import { getLeadsDatabase } from "@/lib/db/client";
import { ensureSchema, setTenantEnabledByAdmin } from "@/lib/db/store";

/**
 * The manual override behind /admin/leads' Pause and Re-enable buttons.
 *
 * Authentication needs no extra code here: server actions POST back to the
 * page route they were rendered from, and every /admin path sits behind the
 * HTTP Basic gate in `proxy.ts`, which fails closed when credentials are
 * unset. A server action can therefore never be reached by a caller who has
 * not already authenticated against /admin/leads.
 *
 * Automatic enablement removed the human look before a tenant launches, so
 * this control is the compensating human point afterwards: pausing takes the
 * capture page and its intake dark immediately (the kill-switch semantics
 * are unchanged), and both directions write an audit row naming who acted.
 *
 * Deliberately quiet on bad input: an unknown slug or malformed request just
 * re-renders the page, exactly like a form that was submitted twice.
 */
export async function setTenantEnabledAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "").trim();
  const intent = String(formData.get("intent") ?? "");

  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) return;
  if (intent !== "pause" && intent !== "resume") return;

  const config = readLeadsDatabaseConfig();
  if (!config) {
    console.error("[admin] tenant override requested but no datastore is configured");
    return;
  }

  try {
    const sql = getLeadsDatabase(config);
    await ensureSchema(sql);
    const changed = await setTenantEnabledByAdmin(
      sql,
      slug,
      intent === "resume",
      process.env.ADMIN_USERNAME ?? "admin",
    );
    if (changed) console.info(`[admin] ${intent} applied to ${slug}`);
  } catch (error) {
    console.error(`[admin] tenant override failed for ${slug}:`, error);
  }

  revalidatePath("/admin/leads");
}
