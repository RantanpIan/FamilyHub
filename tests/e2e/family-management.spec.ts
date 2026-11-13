import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import type { Database } from "../../apps/client/src/auth/database.types";

const supabaseUrl = process.env["SUPABASE_E2E_URL"];
const anonKey = process.env["SUPABASE_E2E_ANON_KEY"];
const serviceRoleKey = process.env["SUPABASE_E2E_SERVICE_ROLE_KEY"];
const emailApiUrl = process.env["SUPABASE_E2E_EMAIL_URL"];
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
      await page.getByRole("button", { name: "Mehr" }).click();
      await expect(
        page.getByRole("heading", { name: "Synthetic E2E family" }),
      ).toBeVisible();
    });
  });

  test("FH-CX-007: desktop and phone navigation preserve the active family", async ({ page }) => {
    await withConfirmedUser(async (user) => {
      await page.goto("/auth");
      await page.getByLabel("E-Mail-Adresse").fill(user.email);
      await page.getByLabel("Passwort", { exact: true }).fill(user.password);
      await page.getByRole("button", { name: "Anmelden" }).click();
      await expect(page.getByRole("heading", { name: "Erstelle eure Familie" })).toBeVisible();

      await page.getByLabel("Familienname").fill("Synthetic responsive family");
      await page.getByRole("button", { name: "Familie erstellen" }).click();
      await expect(page.getByTestId("app-shell")).toBeVisible();

      for (const width of [1280, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 800 });
        const mobile = width <= 680;
        const nav = page.getByRole("navigation", {
          name: mobile ? "Mobile Hauptnavigation" : "Desktop Hauptnavigation",
        });
        await expect(nav).toBeVisible();
        await expect(page.getByLabel("Aktive Familie").first()).toBeVisible();
        await expect(page.getByRole("button", { name: "Profil öffnen" })).toBeVisible();

        const hasHorizontalOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        );
        expect(hasHorizontalOverflow, `horizontal overflow at ${width}px`).toBe(false);
      }

      await page.getByRole("navigation", { name: "Mobile Hauptnavigation" })
        .getByRole("button", { name: "Mehr" }).click();
      await expect(page.getByRole("heading", { name: "Synthetic responsive family" })).toBeVisible();

      await page.setViewportSize({ width: 1280, height: 800 });
      await page.getByRole("button", { name: "Zur Startseite" }).click();
      await expect(page.getByRole("heading", { name: /Alles im Blick/ })).toBeVisible();
      await expect(page.getByTestId("app-shell")).toBeVisible();
    });
  });

  test("FH-CX-009: mobile owner can create, edit and delete an all-day calendar event", async ({ page }) => {
    await withConfirmedUser(async (user) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/auth");
      await page.getByLabel("E-Mail-Adresse").fill(user.email);
      await page.getByLabel("Passwort", { exact: true }).fill(user.password);
      await page.getByRole("button", { name: "Anmelden" }).click();
      await expect(page.getByRole("heading", { name: "Erstelle eure Familie" })).toBeVisible();

      await page.getByLabel("Familienname").fill("Synthetic calendar E2E family");
      await page.getByRole("button", { name: "Familie erstellen" }).click();
      await expect(page.getByTestId("app-shell")).toBeVisible();

      await page.getByRole("navigation", { name: "Mobile Hauptnavigation" })
        .getByRole("button", { name: "Kalender" }).click();
      await expect(page.getByRole("heading", { name: "Synthetic calendar E2E family" })).toBeVisible();
      await expect(page.locator(".calendar-day")).toHaveCount(42);
      const day = await page.evaluate(() => {
        const date = new Date();
        return [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");
      });
      await page.getByRole("button", { name: "+ Termin" }).click();
      await page.getByLabel("Titel").fill("Synthetic calendar E2E event");
      await page.getByRole("checkbox", { name: "Ganztägiger Termin" }).check();
      await page.getByLabel("Datum").fill(day);
      await page.getByRole("button", { name: "Termin erstellen" }).click();

      await expect(page.getByRole("heading", { name: "Synthetic calendar E2E event" })).toBeVisible();
      await page.getByRole("button", { name: "Bearbeiten" }).click();
      await page.getByLabel("Titel").fill("Synthetic calendar E2E updated");
      await page.getByRole("button", { name: "Änderung speichern" }).click();
      await expect(page.getByRole("heading", { name: "Synthetic calendar E2E updated" })).toBeVisible();

      page.once("dialog", (dialog) => void dialog.accept());
      await page.getByRole("button", { name: "Löschen" }).click();
      await expect(page.getByRole("heading", { name: "Keine Termine an diesem Tag" })).toBeVisible();
    });
  });

  test("FH-CAL-UI-T01: full month view, start/end auto adjustment and target member", async ({ page }) => {
    await withConfirmedUser(async (user) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/auth");
      await page.getByLabel("E-Mail-Adresse").fill(user.email);
      await page.getByLabel("Passwort", { exact: true }).fill(user.password);
      await page.getByRole("button", { name: "Anmelden" }).click();
      await page.getByLabel("Familienname").fill("Synthetic month-grid family");
      await page.getByRole("button", { name: "Familie erstellen" }).click();
      await expect(page.getByTestId("app-shell")).toBeVisible();

      await page.getByRole("navigation", { name: "Mobile Hauptnavigation" })
        .getByRole("button", { name: "Mehr" }).click();
      await page.getByLabel("Name des Familienmitglieds").fill("Synthetic dental patient");
      await page.getByLabel("Profiltyp").selectOption("child");
      await page.getByRole("button", { name: "Mitglied hinzufügen" }).click();
      await expect(page.getByText("Synthetic dental patient").first()).toBeVisible();

      await page.getByRole("navigation", { name: "Mobile Hauptnavigation" })
        .getByRole("button", { name: "Kalender" }).click();
      await expect(page.locator(".calendar-day")).toHaveCount(42);
      const firstDay = await page.locator(".calendar-day").first().getAttribute("data-testid");
      expect(firstDay?.startsWith("calendar-day-")).toBe(true);
      await page.getByRole("button", { name: "Nächster Monat" }).click();
      await expect(page.locator(".calendar-day")).toHaveCount(42);
      await page.getByRole("button", { name: "Vorheriger Monat" }).click();
      await page.locator(".calendar-month-toolbar").getByRole("button", { name: "Heute" }).click();

      await page.getByRole("button", { name: "+ Termin" }).click();
      await page.getByLabel("Termin für").selectOption({ label: "Synthetic dental patient" });
      await page.getByLabel("Titel").fill("Synthetic Zahnarzt");
      const day = await page.evaluate(() => {
        const date = new Date();
        return [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");
      });
      await page.getByLabel("Beginn").fill(day + "T14:30");
      await expect(page.locator('input[name="endsAt"]')).toHaveValue(day + "T15:30");
      await page.getByLabel("Beginn").fill(day + "T16:00");
      await expect(page.locator('input[name="endsAt"]')).toHaveValue(day + "T17:00");
      await page.getByRole("button", { name: "Termin erstellen" }).click();
      await expect(page.getByRole("heading", { name: "Synthetic Zahnarzt" })).toBeVisible();
      await expect(page.getByText("Termin für Synthetic dental patient")).toBeVisible();

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow).toBe(false);
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
        hasText: "Verwaltetes Profil · kein Login",
      });
      await expect(member.getByText("Synthetic E2E managed child")).toBeVisible();
      await expect(member.getByText("Verwaltetes Profil · kein Login")).toBeVisible();
      await member.getByLabel("Anzeigename").fill("Synthetic E2E child updated");
      await member.getByRole("button", { name: "Speichern" }).click();
      await expect(member.locator(".family-member-summary strong")).toHaveText(
        "Synthetic E2E child updated",
      );
    });
  });

  test("INV-T01, T06, T07: an invited adult joins through the existing profile", async ({ page, browser }) => {
    test.skip(
      !emailApiUrl,
      "Blocked: configure the disposable Supabase Mailpit URL to verify signup confirmation.",
    );
    await withConfirmedUser(async (adminUser) => {
        const inviteeEmail = `fh-cx-006-e2e-${randomUUID()}@example.com`;
        const inviteePassword = "Synthetic-Family-Invitee-Password-2026!";
        const familyName = `Synthetic invitation E2E family ${randomUUID()}`;
        const inviteeContext = await browser.newContext();
        let testError: unknown = null;
        try {
          await page.goto("/auth");
          await page.getByLabel("E-Mail-Adresse").fill(adminUser.email);
          await page.getByLabel("Passwort", { exact: true }).fill(adminUser.password);
          await page.getByRole("button", { name: "Anmelden" }).click();
          await expect(page.getByRole("heading", { name: "Erstelle eure Familie" })).toBeVisible();
          await page.getByLabel("Familienname").fill(familyName);
          await page.getByRole("button", { name: "Familie erstellen" }).click();
          await expect(page.getByTestId("app-shell")).toBeVisible();
          await page.getByRole("button", { name: "Mehr" }).click();
          await expect(page.getByRole("heading", { name: familyName })).toBeVisible();
          await page.getByLabel("Name des Familienmitglieds").fill("Synthetic invited profile");
          await page.getByLabel("Profiltyp").selectOption("adult");
          await page.getByRole("button", { name: "Mitglied hinzufügen" }).click();
          await expect(
            page.getByRole("list", { name: "Familienmitglieder" }).getByText(
              "Synthetic invited profile",
              { exact: true },
            ),
          ).toBeVisible();

          await page.getByLabel("Vorhandenes Erwachsenenprofil").selectOption({
            label: "Synthetic invited profile",
          });
          await page.getByLabel("E-Mail-Adresse").fill(inviteeEmail);
          await page.getByRole("button", { name: "Einladung erstellen" }).click();
          await expect(page.getByText(/sicher als Dialog/)).toBeVisible();

          const inviteePage = await inviteeContext.newPage();
          await inviteePage.goto("/auth");
          await inviteePage.getByRole("button", { name: "Registrieren" }).click();
          await inviteePage.getByLabel("Anzeigename").fill("Synthetic invited adult");
          await inviteePage.getByLabel("E-Mail-Adresse").fill(inviteeEmail);
          await inviteePage.getByLabel("Passwort", { exact: true }).fill(inviteePassword);
          await inviteePage.getByLabel("Passwort wiederholen").fill(inviteePassword);
          await inviteePage.getByRole("button", { name: "Konto erstellen" }).click();
          await expect(inviteePage.getByRole("heading", { name: "E-Mail bestätigen" })).toBeVisible();
          const confirmationLink = await readConfirmationLink(inviteeEmail);
          await inviteePage.goto(confirmationLink);
          await expect(
            inviteePage.getByRole("dialog").getByText(
              /Synthetic invited profile.*Synthetic invitation E2E family/,
            ),
          ).toBeVisible();
          await inviteePage.getByRole("dialog").getByRole("button", { name: "Einladung annehmen" }).click();
          await expect(inviteePage.getByTestId("app-shell")).toBeVisible();
          await inviteePage.getByRole("button", { name: "Mehr" }).click();
          const invitedMember = inviteePage.locator(".family-member-card").filter({
            hasText: "Synthetic invited profile",
          });
          await expect(invitedMember.getByText("Konto verbunden")).toBeVisible();
        } catch (error) {
          testError = error;
        }
        let contextCleanupError: unknown = null;
        try {
          await inviteeContext.close();
        } catch (error) {
          contextCleanupError = error;
        }
        const { data: users, error: listError } = await adminUser.admin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const { data: family, error: familyLookupError } = await adminUser.admin
          .from("families")
          .select("id")
          .eq("name", familyName)
          .maybeSingle();
        const familyDeleteError = familyLookupError ?? (
          family
            ? (await adminUser.admin.from("families").delete().eq("id", family.id)).error
            : null
        );
        const inviteeUser = users.users.find(
          (candidate) => candidate.email?.toLowerCase() === inviteeEmail.toLowerCase(),
        );
        const inviteeDeleteError = (
          inviteeUser
            ? (await adminUser.admin.auth.admin.deleteUser(inviteeUser.id)).error
            : null
        );
        const cleanupError = listError ?? familyDeleteError ?? inviteeDeleteError;
        if (testError) {
          throw testError;
        }
        if (contextCleanupError) {
          throw contextCleanupError;
        }
        if (cleanupError) {
          throw cleanupError;
        }
    });
  });

    async function readConfirmationLink(email: string): Promise<string> {
      if (!emailApiUrl) {
        throw new Error("The disposable Supabase email API is not configured.");
      }
      const messagesUrl = new URL("/api/v1/messages", emailApiUrl);
      messagesUrl.searchParams.set("start", "0");
      messagesUrl.searchParams.set("limit", "50");
      let messageId: string | null = null;
      await expect.poll(async () => {
        const response = await fetch(messagesUrl);
        if (!response.ok) {
          throw new Error(`Mailpit message-list request failed with HTTP ${response.status}.`);
        }
        const result = await response.json() as {
          messages?: { ID?: string; To?: { Address?: string }[] }[];
        };
        messageId = result.messages?.find((candidate) =>
          candidate.To?.some((recipient) =>
            recipient.Address?.toLowerCase() === email.toLowerCase(),
          ),
        )?.ID ?? null;
        return messageId;
      }, { timeout: 15_000 }).not.toBeNull();

      if (!messageId) {
        throw new Error("Supabase did not deliver a confirmation message to the synthetic mailbox.");
      }
      const messageUrl = new URL(`/api/v1/message/${encodeURIComponent(messageId)}`, emailApiUrl);
      const response = await fetch(messageUrl);
      if (!response.ok) {
        throw new Error(`Mailpit message request failed with HTTP ${response.status}.`);
      }
      const message = await response.json() as { Text?: string; HTML?: string };
      const body = `${message.Text ?? ""}\n${message.HTML ?? ""}`;
      const link = body.match(/https?:\/\/[^\s"'<>]+/)?.[0]?.replaceAll("&amp;", "&");
      if (!link) {
        throw new Error("Supabase confirmation email did not contain a usable link.");
      }
      return link;
    }
});

