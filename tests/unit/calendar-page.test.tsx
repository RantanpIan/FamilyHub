import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarPage } from "../../apps/client/src/calendar/CalendarPage";
import { listCalendarEvents, type CalendarEntry } from "../../apps/client/src/calendar/calendar-service";

const context = vi.hoisted(() => ({
  selectedFamily: { family_id: "family-a", member_id: "owner", family_name: "Testfamilie A" },
  members: [],
}));
vi.mock("../../apps/client/src/family/useFamily", () => ({ useFamily: () => context }));
vi.mock("../../apps/client/src/calendar/calendar-service", () => ({
  listCalendarEvents: vi.fn(), createCalendarEvent: vi.fn(),
  updateCalendarEvent: vi.fn(), deleteCalendarEvent: vi.fn(),
  listCalendarSeries: vi.fn().mockResolvedValue([]),
  listCalendarSeriesOccurrences: vi.fn().mockResolvedValue([]),
  listCalendarSeriesExceptions: vi.fn().mockResolvedValue([]),
}));

const entry = {
  resource_id: "event-a", resource_type: "calendar_event", family_id: "family-a", title: "Synthetischer Termin",
  is_all_day: true, start_date: "2026-11-14", end_date_exclusive: "2026-11-15",
  starts_at: null, ends_at: null, time_zone: "Europe/Berlin", subject_member_id: null,
  created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z",
  resource: { id: "event-a", owner_member_id: "owner", visibility: "private", version: 1 },
} satisfies CalendarEntry;

beforeEach(() => {
  vi.useRealTimers();
  vi.mocked(listCalendarEvents).mockReset().mockResolvedValue([entry]);
  context.selectedFamily = { family_id: "family-a", member_id: "owner", family_name: "Testfamilie A" };
});
afterEach(cleanup);

async function selectNovember() {
  // Month navigation remains deterministic regardless of the machine date.
  const target = new Date(2026, 10, 1);
  const now = new Date();
  const delta = (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth();
  for (let i = 0; i < Math.abs(delta); i++) {
    fireEvent.click(screen.getByRole("button", { name: delta < 0 ? "Vorheriger Monat" : "Nächster Monat" }));
  }
  fireEvent.click(screen.getByTestId("calendar-day-2026-11-14"));
  await screen.findByRole("heading", { name: "Synthetischer Termin" });
}

describe("FH-CX-010 Kalendernavigation", () => {
  it.each(["Familie", "Mitglied"])("ignoriert verspätete Antworten nach Wechsel: %s", async (wechsel) => {
    let resolveOld!: (rows: CalendarEntry[]) => void;
    vi.mocked(listCalendarEvents).mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }));
    const view = render(<CalendarPage />);
    context.selectedFamily = wechsel === "Familie"
      ? { family_id: "family-b", member_id: "other", family_name: "Testfamilie B" }
      : { ...context.selectedFamily, member_id: "other" };
    vi.mocked(listCalendarEvents).mockResolvedValueOnce([]);
    view.rerender(<CalendarPage />);
    await waitFor(() => expect(listCalendarEvents).toHaveBeenLastCalledWith(
      wechsel === "Familie" ? "family-b" : "family-a",
    ));
    await act(async () => resolveOld([entry]));
    const now = new Date();
    const delta = (2026 - now.getFullYear()) * 12 + 10 - now.getMonth();
    for (let i = 0; i < Math.abs(delta); i++) {
      fireEvent.click(screen.getByRole("button", { name: delta < 0 ? "Vorheriger Monat" : "Nächster Monat" }));
    }
    fireEvent.click(screen.getByTestId("calendar-day-2026-11-14"));
    expect(screen.queryByRole("heading", { name: "Synthetischer Termin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByTestId(/^calendar-day-/).every((day) => day.getAttribute("aria-label")?.includes("keine Termine"))).toBe(true);
  });

  it("zeigt alle 42 Tage, leere Tage, Monatswechsel und die Tagesauswahl", async () => {
    render(<CalendarPage />);
    await selectNovember();
    expect(screen.getAllByTestId(/^calendar-day-/)).toHaveLength(42);
    expect(screen.getByTestId("calendar-day-2026-11-14")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByTestId("calendar-day-2026-11-15"));
    expect(screen.getByText("Keine Termine an diesem Tag")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nächster Monat" }));
    expect(screen.getByRole("heading", { name: "Dezember 2026" })).toBeInTheDocument();
  });

  it("zeigt den ausgewählten Einzeltermin in der Tagesansicht", async () => {
    render(<CalendarPage />);
    await selectNovember();
    expect(screen.getByRole("heading", { name: "Synthetischer Termin" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Einzeltermine am ausgewählten Tag" })).toBeInTheDocument();
  });

  it("zeigt keine alten Einzeltermine nach einem Familienwechsel", async () => {
    const view = render(<CalendarPage />);
    await selectNovember();
    context.selectedFamily = { family_id: "family-b", member_id: "other", family_name: "Testfamilie B" };
    vi.mocked(listCalendarEvents).mockResolvedValueOnce([]);
    view.rerender(<CalendarPage />);
    await waitFor(() => expect(screen.queryByText("Synthetischer Termin")).not.toBeInTheDocument());
    expect(screen.queryByText("Synthetischer Termin")).not.toBeInTheDocument();
    expect(screen.getByTestId("calendar-day-2026-11-14")).toHaveAccessibleName(/keine Termine/);
  });

  it("zeigt Laden, bereinigte Fehler, Zugriff verweigert und Wiederholung", async () => {
    let rejectRequest!: (error: unknown) => void;
    vi.mocked(listCalendarEvents).mockReturnValueOnce(new Promise((_, reject) => { rejectRequest = reject; }));
    render(<CalendarPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Termine werden geladen");
    await act(async () => rejectRequest({ code: "42501", message: "Vertraulicher Inhalt" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Termine konnten nicht geladen werden");
    expect(screen.queryByText(/Vertraulicher Inhalt/)).not.toBeInTheDocument();
    vi.mocked(listCalendarEvents).mockRejectedValueOnce(new Error("Interne Daten"));
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Bitte versuche es erneut"));
    expect(screen.queryByText(/Interne Daten/)).not.toBeInTheDocument();
  });

  it("zeigt nach Familienwechsel keine alten privaten Inhalte während der neuen Anfrage", async () => {
    const view = render(<CalendarPage />);
    await selectNovember();
    context.selectedFamily = { family_id: "family-b", member_id: "other", family_name: "Testfamilie B" };
    vi.mocked(listCalendarEvents).mockReturnValueOnce(new Promise(() => {}));
    view.rerender(<CalendarPage />);
    expect(screen.queryByRole("heading", { name: "Synthetischer Termin" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(listCalendarEvents).toHaveBeenLastCalledWith("family-b");
  });
});

