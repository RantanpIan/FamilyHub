import { describe, expect, it } from "vitest";
import {
  NewPasswordSchema,
  SignInInputSchema,
  SignUpInputSchema,
  UpdateProfileInputSchema,
} from "@familyhub/contracts";
import {
  createAuthCallbackUrl,
  getCallbackFlow,
  getSafeAuthErrorMessage,
} from "../../apps/client/src/auth/auth-utils";
import { createBrowserAuthConfig } from "../../apps/client/src/auth/auth-client";

describe("auth input contracts", () => {
  it("normalizes a valid sign-in email", () => {
    expect(
      SignInInputSchema.parse({ email: "  USER@EXAMPLE.COM ", password: "secret" }),
    ).toEqual({ email: "user@example.com", password: "secret" });
  });

  it("requires a valid registration name, strong password, and matching confirmation", () => {
    expect(
      SignUpInputSchema.safeParse({
        displayName: " Synthetic User ",
        email: "USER@example.com",
        password: "Correct-Horse-2026!",
        passwordConfirmation: "Correct-Horse-2026!",
      }).success,
    ).toBe(true);
    expect(
      SignUpInputSchema.safeParse({
        displayName: " ",
        email: "user@example.com",
        password: "short",
        passwordConfirmation: "different",
      }).success,
    ).toBe(false);
  });

  it("validates password update confirmation and profile display names", () => {
    expect(
      NewPasswordSchema.safeParse({
        password: "A-New-Synthetic-Password-2026!",
        passwordConfirmation: "A-New-Synthetic-Password-2026!",
      }).success,
    ).toBe(true);
    expect(
      NewPasswordSchema.safeParse({
        password: "A-New-Synthetic-Password-2026!",
        passwordConfirmation: "not-the-same",
      }).success,
    ).toBe(false);
    expect(UpdateProfileInputSchema.safeParse({ displayName: "  " }).success).toBe(false);
    expect(
      UpdateProfileInputSchema.safeParse({ displayName: "Synthetic user" }).success,
    ).toBe(true);
  });
});

describe("auth callbacks and safe errors", () => {
  it("creates only fixed same-origin callback URLs", () => {
    expect(
      createAuthCallbackUrl("https://familyhub.example", "email-confirmation"),
    ).toBe("https://familyhub.example/auth?flow=email-confirmation");
    expect(
      createAuthCallbackUrl("http://127.0.0.1:5173", "password-recovery"),
    ).toBe("http://127.0.0.1:5173/auth?flow=password-recovery");
    expect(createAuthCallbackUrl("http://familyhub.example", "email-confirmation")).toBeNull();
    expect(
      createAuthCallbackUrl("https://familyhub.example/path?next=https://evil.example", "email-confirmation"),
    ).toBeNull();
  });

  it("recognizes only known auth callback flows and ignores return-to parameters", () => {
    expect(getCallbackFlow("?flow=password-recovery")).toBe("password-recovery");
    expect(getCallbackFlow("?flow=email-confirmation&next=https://evil.example")).toBe(
      "email-confirmation",
    );
    expect(getCallbackFlow("?flow=arbitrary&next=https://evil.example")).toBeNull();
  });

  it("maps credential errors to a safe message without exposing the raw response", () => {
    const rawError = "Invalid login credentials; internal trace and token=secret";
    const message = getSafeAuthErrorMessage({ message: rawError });

    expect(message).toBe("E-Mail-Adresse oder Passwort ist nicht korrekt.");
    expect(message).not.toContain("secret");
    expect(message).not.toContain("trace");
  });

  it("rejects missing or non-HTTPS production browser configuration", () => {
    expect(createBrowserAuthConfig(undefined, undefined).configured).toBe(false);
    expect(
      createBrowserAuthConfig("http://example.com", "synthetic-public-key").configured,
    ).toBe(false);
    expect(
      createBrowserAuthConfig("https://familyhub.example", "synthetic-public-key").configured,
    ).toBe(true);
  });
});
