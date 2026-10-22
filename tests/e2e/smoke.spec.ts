import { expect, test } from "@playwright/test";

test("unauthenticated users cannot access protected app content", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("heading", { name: "Willkommen zurück" })).toBeVisible();
  await expect(page.getByTestId("app-shell")).toHaveCount(0);

  await page.getByRole("button", { name: "Registrieren" }).click();
  await expect(page.getByRole("heading", { name: "Ein Konto für euren Alltag" })).toBeVisible();
  await expect(page.getByLabel("Anzeigename")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Ein Konto für euren Alltag" })).toBeVisible();
  const card = await page.locator(".auth-card").boundingBox();
  expect(card?.width).toBeLessThanOrEqual(390);
});
