import { expect, test } from "@playwright/test";

test("Foundation navigation is clear and responsive", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Alles im Blick/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Hauptnavigation" }).first()).toBeVisible();

  await page.getByRole("button", { name: /Kalender/ }).first().click();
  await expect(
    page.getByRole("heading", { name: "Der Familienkalender ist noch nicht verfügbar" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Schule/ }).first().click();
  await expect(
    page.getByRole("heading", { name: "Der Schulbereich ist noch nicht verfügbar" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("navigation", { name: "Hauptnavigation" }).last()).toBeVisible();
  await expect(page.getByRole("button", { name: /Heute/ }).last()).toBeVisible();
});
