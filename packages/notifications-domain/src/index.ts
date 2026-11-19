export const notificationsModule = {
  id: "notifications",
  status: "unavailable",
  statusLabel: "Noch nicht verfügbar",
} as const;

export const pushProviders = ["fcm", "apns", "web_push"] as const;
export type PushProvider = (typeof pushProviders)[number];

export type PushSubscriptionIdentity = {
  familyId: string;
  subscriptionKey: string;
};

export type PushSubscriptionRegistration = PushSubscriptionIdentity & (
  | { provider: "fcm" | "apns"; credentials: { token: string } }
  | { provider: "web_push"; credentials: { endpoint: string; p256dh: string; auth: string } }
);

export function isPushProvider(value: unknown): value is PushProvider {
  return pushProviders.some((provider) => provider === value);
}

export function isPushSubscriptionKey(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
}
