import { expect, test } from "@playwright/test";

// Browserprüfung mit simulierten Services, ohne DB-Schreibzugriffe.
// Der Nachweis echter RLS liegt weiterhin bei den Integrationstests.
for (const width of [320, 390, 768, 1440]) {
  test(`FH-CX-010: Monats-/Detailnavigation mit Tastatur bei ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.install({ time: new Date("2026-11-14T12:00:00Z") });
    for (const [path, name] of [
      ["auth/AuthContext.tsx", "AuthProvider"],
      ["family/FamilyProvider.tsx", "FamilyProvider"],
    ]) {
      await page.route(`**/src/${path}*`, (route) => route.fulfill({
        contentType: "application/javascript",
        body: `export const ${name} = ({children}) => children;`,
      }));
    }
    await page.route("**/src/auth/useAuth.ts*", (route) => route.fulfill({
      contentType: "application/javascript",
      body: `export const useAuth = () => ({ status: 'ready', user: {id:'synthetic'},
        profileStatus: 'ready', profile: {display_name:'Testkonto'}, sessionGeneration: 1 });`,
    }));
    await page.route("**/src/family/useFamily.ts*", (route) => route.fulfill({
      contentType: "application/javascript",
      body: `const family = {family_id:'family-a', member_id:'owner', family_name:'Testfamilie'};
        export const useFamily = () => ({status:'ready', selectedFamily:family,
          families:[family], members:[], pendingInvitations:[]});`,
    }));
    await page.route("**/src/calendar/calendar-service.ts*", (route) => route.fulfill({
      contentType: "application/javascript",
      body: `export const listCalendarEvents = async () => [{resource_id:'event-a',
        title:'Synthetischer Testtermin mit einer langen Beschreibung im Titel',
        family_id:'family-a', is_all_day:true, start_date:'2026-11-14',
        end_date_exclusive:'2026-11-15', time_zone:'Europe/Berlin',
        resource:{id:'event-a',owner_member_id:'owner',visibility:'private',version:1}}];
        export const createCalendarEvent = async () => {};
        export const updateCalendarEvent = async () => {};
        export const deleteCalendarEvent = async () => {};`,
    }));
    await page.goto("/app");
    await page.getByRole("button", { name: "Kalender", exact: true }).filter({ visible: true }).click();
    await expect(page.locator(".calendar-day")).toHaveCount(42);
    await expect(page.getByRole("heading", { name: "November 2026", exact: true })).toBeVisible();
    const emptyDay = page.getByTestId("calendar-day-2026-11-15");
    await emptyDay.focus();
    await page.keyboard.press("Enter");
    await expect(emptyDay).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Keine Termine an diesem Tag")).toBeVisible();
    await page.getByTestId("calendar-day-2026-11-14").focus();
    await page.keyboard.press("Space");
    const details = page.getByRole("button", { name: /Details zu/ });
    await details.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Termindetails" })).toBeFocused();
    await expect(page.getByText("Zugriff auf Termin wird geprüft")).toHaveCount(0);
    const back = page.getByRole("button", { name: "Zurück zur Tagesansicht" });
    await back.focus();
    await page.keyboard.press("Enter");
    await expect(details).toBeFocused();
    await page.getByRole("button", { name: "Nächster Monat" }).click();
    await expect(page.getByRole("heading", { name: "Dezember 2026", exact: true })).toBeVisible();
    await page.locator(".calendar-month-toolbar").getByRole("button", { name: "Heute", exact: true }).click();
    await expect(page.getByTestId("calendar-day-2026-11-14")).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const button of [details, page.getByRole("button", { name: "+ Termin", exact: true })]) {
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport();
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      await button.click({ trial: true });
    }
  });
}
