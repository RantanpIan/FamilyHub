import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import type { Database } from "../../apps/client/src/auth/database.types";

const supabaseUrl = process.env["SUPABASE_E2E_URL"];
const anonKey = process.env["SUPABASE_E2E_ANON_KEY"];
const serviceRoleKey = process.env["SUPABASE_E2E_SERVICE_ROLE_KEY"];
const canRunAgainstSupabase = Boolean(supabaseUrl && anonKey && serviceRoleKey);

async function createConfirmedUser() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("E2E requires a disposable local Supabase stack.");
  }
  const admin = createClient<Database, "public">(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `fh-cx-004-e2e-${randomUUID()}@example.com`;
  const password = "Synthetic-Family-E2E-Password-2026!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Synthetic E2E administrator" },
  });
  if (error || !data.user) {
    throw error ?? new Error("Supabase did not create the synthetic E2E user.");
  }
  return { admin, userId: data.user.id, email, password };
}

async function withConfirmedUser(
  action: (user: Awaited<ReturnType<typeof createConfirmedUser>>) => Promise<void>,
) {
  const user = await createConfirmedUser();
  let actionFailed = false;
  let actionError: unknown;
  try {
    await action(user);
  } catch (error) {
    actionFailed = true;
    actionError = error;
  }

  const { error: cleanupError } = await user.admin.auth.admin.deleteUser(user.userId);
  if (actionFailed) {
    throw actionError;
  }
  if (cleanupError) {
    throw cleanupError;
  }
}

test.describe("family onboarding with a disposable Supabase backend", () => {
  test.skip(
    !canRunAgainstSupabase,
    "Blocked: provide a disposable Supabase E2E stack to verify backend-backed family flows.",
  );

  test("FAM-T06, T01, T02: a signed-in account can create its first family", async ({ page }) => {
    await withConfirmedUser(async (user) => {
      await page.goto("/auth");
      await page.getByLabel("E-Mail-Adresse").fill(user.email);
      await page.getByLabel("Passwort", { exact: true }).fill(user.password);
      await page.getByRole("button", { name: "Anmelden" }).click();
      await expect(page.getByRole("heading", { name: "Erstelle eure Familie" })).toBeVisible();

      await page.getByLabel("Familienname").fill("Synthetic E2E family");
      await page.getByRole("button", { name: "Familie erstellen" }).click();
      await expect(page.getByTestId("app-shell")).toBeVisible();
      await expect(page.getByText("Synthetic E2E family")).toBeVisible();
    });
  });

  test("FAM-T07, T08, T15: an administrator creates and updates a managed child profile", async ({ page }) => {
    await withConfirmedUser(async (user) => {
      await page.goto("/auth");
      await page.getByLabel("E-Mail-Adresse").fill(user.email);
      await page.getByLabel("Passwort", { exact: true }).fill(user.password);
      await page.getByRole("button", { name: "Anmelden" }).click();
      await expect(page.getByRole("heading", { name: "Erstelle eure Familie" })).toBeVisible();
      await page.getByLabel("Familienname").fill("Synthetic E2E member family");
      await page.getByRole("button", { name: "Familie erstellen" }).click();
      await expect(page.getByTestId("app-shell")).toBeVisible();

      await page.getByRole("button", { name: "Mehr" }).click();
      await expect(page.getByRole("heading", { name: "Synthetic E2E member family" })).toBeVisible();
      await page.getByLabel("Name des Familienmitglieds").fill("Synthetic E2E managed child");
      await page.getByLabel("Profiltyp").selectOption("child");
      await page.getByRole("button", { name: "Mitglied hinzufügen" }).click();

      const member = page.locator(".family-member-card").filter({
        hasText: "Synthetic E2E managed child",
      });
      await expect(member.getByText("Verwaltetes Profil · kein Login")).toBeVisible();
      await member.getByLabel("Anzeigename").fill("Synthetic E2E child updated");
      await member.getByRole("button", { name: "Speichern" }).click();
      await expect(member.getByText("Synthetic E2E child updated")).toBeVisible();
    });
  });
});
