import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import type { Database } from "../../apps/client/src/auth/database.types";

const supabaseUrl = process.env["SUPABASE_E2E_URL"];
const anonKey = process.env["SUPABASE_E2E_ANON_KEY"];
const serviceRoleKey = process.env["SUPABASE_E2E_SERVICE_ROLE_KEY"];
const canRunAgainstSupabase = Boolean(supabaseUrl && anonKey && serviceRoleKey);

async function createUser() {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("E2E requires disposable Supabase.");
  const admin = createClient<Database, "public">(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `fh-cx-012-e2e-${randomUUID()}@example.com`;
  const password = "Synthetic-Calendar-Exception-Password-2026!";
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Synthetic series exception owner" },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("E2E user missing.");
  const client = createClient<Database, "public">(supabaseUrl, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  return { admin, client, userId: created.data.user.id, email, password };
}

test.describe("FH-CX-012: calendar series exceptions", () => {
  test.skip(!canRunAgainstSupabase, "Requires a disposable local Supabase E2E stack.");

  test("owner can override, cancel and reset one series occurrence", async ({ page }) => {
    const user = await createUser();
    try {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/auth");
      await page.getByLabel("E-Mail-Adresse").fill(user.email);
      await page.getByLabel("Passwort", { exact: true }).fill(user.password);
      await page.getByRole("button", { name: "Anmelden" }).click();
      await page.getByLabel("Familienname").fill("Synthetic series exception family");
      await page.getByRole("button", { name: "Familie erstellen" }).click();
      await expect(page.getByTestId("app-shell")).toBeVisible();

      const membership = await user.admin.from("family_memberships")
        .select("family_id, member_id")
        .eq("user_id", user.userId)
        .eq("status", "active")
        .single();
      if (membership.error || !membership.data) throw membership.error ?? new Error("Membership missing.");
      const day = await page.evaluate(() => {
        const date = new Date();
        return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
      });
      const created = await user.client.rpc("create_calendar_series_for_member", {
        p_family_id: membership.data.family_id,
        p_title: "Synthetic series exception",
        p_is_all_day: false,
        p_starts_at: `${day}T10:00:00+01:00`,
        p_ends_at: `${day}T11:00:00+01:00`,
        p_start_date: null,
        p_end_date_exclusive: null,
        p_time_zone: "Europe/Berlin",
        p_visibility: "private",
        p_request_id: randomUUID(),
        p_subject_member_id: membership.data.member_id,
        p_recurrence_rule: "FREQ=DAILY;COUNT=2",
      });
      if (created.error) throw created.error;

      await page.getByRole("navigation", { name: "Mobile Hauptnavigation" })
        .getByRole("button", { name: "Kalender" }).click();
      await expect(page.getByRole("heading", { name: "Synthetic series exception" })).toBeVisible();
      await page.getByRole("button", { name: "Vorkommen ändern" }).click();
      await page.getByLabel("Titel").fill("Synthetic overridden occurrence");
      await page.getByRole("button", { name: "Vorkommen speichern" }).click();
      await expect(page.getByRole("heading", { name: "Synthetic overridden occurrence" })).toBeVisible();

      await page.getByRole("button", { name: "Ausnahme bearbeiten" }).click();
      await page.getByRole("button", { name: "Vorkommen absagen" }).click();
      await expect(page.getByText("Serientermin · abgesagt")).toBeVisible();

      await page.getByRole("button", { name: "Ausnahme bearbeiten" }).click();
      await page.getByRole("button", { name: "Ausnahme zurücksetzen" }).click();
      await expect(page.getByRole("heading", { name: "Synthetic series exception" })).toBeVisible();
    } finally {
      await user.admin.auth.admin.deleteUser(user.userId);
    }
  });
});

