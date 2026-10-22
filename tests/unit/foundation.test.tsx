import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { canReadPersonalContent } from "@familyhub/authorization";
import {
  FamilyIdSchema,
  FamilyMemberIdSchema,
  NotificationRecipientSelectionSchema,
  PrivateContentAccessSchema,
} from "@familyhub/contracts";
import { EmptyState, ErrorState, LoadingState } from "@familyhub/ui";

afterEach(cleanup);

const familyId = "d1169748-1b21-4b9f-a35a-ec07a7d58b0e";
const otherFamilyId = "4cf12ceb-992f-45fa-aea1-e22515f4d026";
const ownerId = "ac5f0896-ea90-436e-aa98-452a001700d4";
const adminId = "4ac1c82d-02cb-4e2f-88b5-20a8e5e264db";
const memberId = "0c942823-05d4-4087-8122-05addc16b61a";

describe("shared contracts", () => {
  it("validates branded family and member IDs", () => {
    expect(FamilyIdSchema.safeParse(familyId).success).toBe(true);
    expect(FamilyIdSchema.safeParse("family-1").success).toBe(false);
    expect(FamilyMemberIdSchema.safeParse(memberId).success).toBe(true);
  });

  it("models an explicit all-recipient option and validates selected IDs", () => {
    expect(NotificationRecipientSelectionSchema.parse({ kind: "all" })).toEqual({
      kind: "all",
    });
    expect(
      NotificationRecipientSelectionSchema.safeParse({
        kind: "selected",
        memberIds: [memberId],
      }).success,
    ).toBe(true);
    expect(
      NotificationRecipientSelectionSchema.safeParse({
        kind: "selected",
        memberIds: [memberId, memberId],
      }).success,
    ).toBe(false);
  });
});

describe("personal-content access policy", () => {
  it("allows the owner to read private content", () => {
    expect(
      canReadPersonalContent(
        PrivateContentAccessSchema.parse({
          actorUserId: ownerId,
          ownerUserId: ownerId,
          familyId,
          actorFamilyIds: [familyId],
          visibility: "private",
        }),
      ),
    ).toBe(true);
  });

  it("does not grant family administrators access to another person's private content", () => {
    expect(
      canReadPersonalContent(
        PrivateContentAccessSchema.parse({
          actorUserId: adminId,
          ownerUserId: ownerId,
          familyId,
          actorFamilyIds: [familyId],
          visibility: "private",
        }),
      ),
    ).toBe(false);
  });

  it("limits family-visible content to members of that family", () => {
    expect(
      canReadPersonalContent(
        PrivateContentAccessSchema.parse({
          actorUserId: adminId,
          ownerUserId: ownerId,
          familyId,
          actorFamilyIds: [familyId],
          visibility: "family",
        }),
      ),
    ).toBe(true);
    expect(
      canReadPersonalContent(
        PrivateContentAccessSchema.parse({
          actorUserId: adminId,
          ownerUserId: ownerId,
          familyId,
          actorFamilyIds: [otherFamilyId],
          visibility: "family",
        }),
      ),
    ).toBe(false);
  });

  it("keeps family data isolated even when the requesting user owns the content", () => {
    expect(
      canReadPersonalContent(
        PrivateContentAccessSchema.parse({
          actorUserId: ownerId,
          ownerUserId: ownerId,
          familyId,
          actorFamilyIds: [otherFamilyId],
          visibility: "private",
        }),
      ),
    ).toBe(false);
  });
});

describe("shared UI states", () => {
  it("announces loading, error, and empty states accessibly", () => {
    const { unmount } = render(<LoadingState label="Wird geladen" />);
    expect(screen.getByRole("status")).toHaveTextContent("Wird geladen");
    unmount();

    const errorRender = render(<ErrorState description="Bitte später erneut versuchen." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Das hat nicht geklappt");
    errorRender.unmount();

    render(<EmptyState title="Noch keine Inhalte" description="Hier ist es noch ruhig." />);
    expect(screen.getByRole("heading", { name: "Noch keine Inhalte" })).toBeInTheDocument();
  });
});
