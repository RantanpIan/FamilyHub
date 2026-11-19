import { describe, expect, it } from "vitest";
import { isPushProvider, isPushSubscriptionKey } from "@familyhub/notifications-domain";

describe("FH-CX-017 Push-Subscription-Kennung", () => {
  it.each(["fcm", "apns", "web_push"])("akzeptiert den Provider %s", (provider) => {
    expect(isPushProvider(provider)).toBe(true);
  });

  it.each(["FCM", "email", "", null, {}])("lehnt unbekannte Provider ab", (provider) => {
    expect(isPushProvider(provider)).toBe(false);
  });

  it("akzeptiert eine UUID und lehnt ungültige Kennungen ab", () => {
    const key = "d24423e9-572f-4ec7-babe-ca5a4753fb1d";
    expect(isPushSubscriptionKey(key)).toBe(true);
    expect(isPushSubscriptionKey(key.toUpperCase())).toBe(true);
    expect(isPushSubscriptionKey(` ${key}`)).toBe(false);
    expect(isPushSubscriptionKey("device-1")).toBe(false);
    expect(isPushSubscriptionKey(null)).toBe(false);
  });
});
