import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EmptyState, ErrorState, LoadingState } from "@familyhub/ui";

afterEach(cleanup);

describe("shared UI states", () => {
  it("announces loading, error, and empty states accessibly", () => {
    const loadingRender = render(<LoadingState label="Wird geladen" />);
    expect(screen.getByRole("status")).toHaveTextContent("Wird geladen");
    loadingRender.unmount();

    const errorRender = render(<ErrorState description="Bitte später erneut versuchen." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Das hat nicht geklappt");
    errorRender.unmount();

    render(<EmptyState title="Noch keine Inhalte" description="Hier ist es noch ruhig." />);
    expect(screen.getByRole("heading", { name: "Noch keine Inhalte" })).toBeInTheDocument();
  });
});
