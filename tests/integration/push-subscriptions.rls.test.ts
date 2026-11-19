import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../apps/client/src/auth/database.types";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`FH-CX-017 benötigt ${name} der lokalen CI-Supabase-Instanz.`);
  return value;
}

const url = required("SUPABASE_TEST_URL");
const anon = required("SUPABASE_TEST_ANON_KEY");
const serviceKey = required("SUPABASE_TEST_SERVICE_ROLE_KEY");
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname) || anon === serviceKey) {
  throw new Error("FH-CX-017 benötigt lokale Supabase und getrennte Testschlüssel.");
}

function client(key = anon) {
  return createClient<Database, "public">(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const service = client(serviceKey);
const users: string[] = [];
const families: string[] = [];

async function createUser() {
  const email = `fh-cx-017-${randomUUID()}@example.com`;
  const password = randomUUID();
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (!created.data.user || created.error) throw new Error("Testkonto konnte nicht erstellt werden.");
  const id = created.data.user.id;
  users.push(id);
  const profile = await service.from("user_profiles").upsert({ user_id: id, display_name: "Push-Testkonto" });
  if (profile.error) throw new Error("Testprofil konnte nicht erstellt werden.");
  const api = client();
  const signed = await api.auth.signInWithPassword({ email, password });
  if (signed.error) throw new Error("Anmeldung des Testkontos fehlgeschlagen.");
  return { api, id };
}

type Actor = Awaited<ReturnType<typeof createUser>>;

async function createFamily(actor: Actor) {
  const result = await actor.api.rpc("create_family", {
    p_name: "Push-Testfamilie",
    p_request_id: randomUUID(),
  });
  const id = result.data?.[0]?.family_id;
  if (!id || result.error) throw new Error("Testfamilie konnte nicht erstellt werden.");
  families.push(id);
  return id;
}

function identity(familyId: string, key = randomUUID()) {
  return { p_family_id: familyId, p_provider: "fcm" as const, p_subscription_key: key };
}

function credentials() {
  return { token: randomUUID() };
}

describe("FH-CX-017 Push-Subscriptions", () => {
  let owner: Actor;
  let other: Actor;
  let home: string;
  let second: string;
  let foreign: string;

  beforeAll(async () => {
    owner = await createUser();
    other = await createUser();
    home = await createFamily(owner);
    second = await createFamily(owner);
    foreign = await createFamily(other);
    const member = await service.from("family_members")
      .insert({ family_id: home, display_name: "Push-Testmitglied", member_type: "adult" })
      .select("id").single();
    if (!member.data || member.error) throw new Error("Testmitglied fehlt.");
    const membership = await service.from("family_memberships")
      .insert({ family_id: home, member_id: member.data.id, user_id: other.id, role: "adult" });
    if (membership.error) throw new Error("Testmitgliedschaft fehlt.");
  });

  afterAll(async () => {
    if (families.length) {
      const result = await service.from("families").delete().in("id", families);
      expect(result.error?.code).toBeUndefined();
    }
    for (const id of users) {
      const result = await service.auth.admin.deleteUser(id);
      expect(result.error?.code).toBeUndefined();
    }
  });

  it("registriert parallel ohne Duplikate, aktualisiert und widerruft idempotent", async () => {
    const args = identity(home);
    const initial = { ...args, p_credentials: credentials() };
    const results = await Promise.all(Array.from({ length: 4 }, () =>
      owner.api.rpc("register_push_subscription_v1", initial)));
    expect(results.map(({ error }) => error?.code)).toEqual(Array(4).fill(undefined));

    const updated = credentials();
    const rotation = await owner.api.rpc("register_push_subscription_v1", { ...args, p_credentials: updated });
    expect(rotation.error?.code).toBeUndefined();
    const persisted = await service.from("push_subscriptions").select("credentials")
      .eq("user_id", owner.id).eq("family_id", home).eq("provider", args.p_provider)
      .eq("subscription_key", args.p_subscription_key).single();
    expect(persisted.error?.code).toBeUndefined();
    expect(persisted.data !== null && "token" in persisted.data.credentials
      && persisted.data.credentials.token === updated.token).toBe(true);
    const listed = await owner.api.rpc("list_push_subscriptions_v1", { p_family_id: home });
    expect(listed.error?.code).toBeUndefined();
    expect(listed.data).toEqual([{ provider: "fcm", subscription_key: args.p_subscription_key }]);

    for (let attempt = 0; attempt < 2; attempt++) {
      const revoked = await owner.api.rpc("revoke_push_subscription_v1", args);
      expect(revoked.error?.code).toBeUndefined();
    }
    const empty = await owner.api.rpc("list_push_subscriptions_v1", { p_family_id: home });
    expect(empty.error?.code).toBeUndefined();
    expect(empty.data).toEqual([]);
  });

  it("isoliert denselben Schlüssel nach Familie und Konto", async () => {
    const args = identity(home);
    const register = (familyId: string) => owner.api.rpc("register_push_subscription_v1", {
      ...args, p_family_id: familyId, p_credentials: credentials(),
    });
    expect((await register(home)).error?.code).toBeUndefined();
    expect((await register(second)).error?.code).toBeUndefined();

    const otherList = await other.api.rpc("list_push_subscriptions_v1", { p_family_id: home });
    expect(otherList.error?.code).toBeUndefined();
    expect(otherList.data).toEqual([]);
    const otherRevoke = await other.api.rpc("revoke_push_subscription_v1", args);
    expect(otherRevoke.error?.code).toBeUndefined();
    const homeList = await owner.api.rpc("list_push_subscriptions_v1", { p_family_id: home });
    expect(homeList.data?.some((row) => row.subscription_key === args.p_subscription_key)).toBe(true);

    expect((await owner.api.rpc("revoke_push_subscription_v1", args)).error?.code).toBeUndefined();
    const firstList = await owner.api.rpc("list_push_subscriptions_v1", { p_family_id: home });
    const secondList = await owner.api.rpc("list_push_subscriptions_v1", { p_family_id: second });
    expect(firstList.data).toEqual([]);
    expect(secondList.data).toEqual([{ provider: "fcm", subscription_key: args.p_subscription_key }]);

    expect((await register(foreign)).error?.code).toBe("42501");
    expect((await owner.api.rpc("list_push_subscriptions_v1", { p_family_id: foreign })).error?.code).toBe("42501");
    expect((await owner.api.rpc("revoke_push_subscription_v1", {
      ...args, p_family_id: foreign,
    })).error?.code).toBe("42501");
  });

  it("akzeptiert Web Push und APNs und gibt nur Metadaten zurück", async () => {
    const args = identity(home);
    const endpoint = `https://example.invalid/${randomUUID()}`;
    const web = await owner.api.rpc("register_push_subscription_v1", {
      ...args, p_provider: "web_push", p_credentials: { endpoint, p256dh: "synthetic", auth: "synthetic" },
    });
    const apns = await owner.api.rpc("register_push_subscription_v1", {
      ...args, p_provider: "apns", p_credentials: credentials(),
    });
    expect([web.error?.code, apns.error?.code]).toEqual([undefined, undefined]);
    const listed = await owner.api.rpc("list_push_subscriptions_v1", { p_family_id: home });
    expect(listed.error?.code).toBeUndefined();
    const rows = listed.data?.filter((row) => row.subscription_key === args.p_subscription_key);
    expect(rows?.length).toBe(2);
    expect(rows?.every((row) => Object.keys(row).sort().join(",") === "provider,subscription_key")).toBe(true);
    expect(rows?.map((row) => row.provider).sort()).toEqual(["apns", "web_push"]);
  });

  it("verweigert anonyme Aufrufe und direkte Tabellenzugriffe", async () => {
    const args = identity(home);
    const payload = credentials();
    const anonymous = await client().rpc("register_push_subscription_v1", { ...args, p_credentials: payload });
    expect(anonymous.error !== null).toBe(true);

    const table = owner.api.from("push_subscriptions");
    const insert = await table.insert({
      family_id: home, user_id: owner.id, provider: args.p_provider,
      subscription_key: args.p_subscription_key, credentials: payload,
    });
    const select = await table.select("credentials").eq("family_id", home);
    const update = await table.update({ credentials: payload }).eq("family_id", home);
    const remove = await table.delete().eq("family_id", home);
    expect([insert, select, update, remove].map((result) => result.error?.code))
      .toEqual(Array(4).fill("42501"));
  });

  it("meldet ungültige Eingaben ohne Zugangsdaten in API-Fehlern", async () => {
    const args = identity(home);
    const token = `${randomUUID()} ungültig`;
    const endpoint = `http://example.invalid/${randomUUID()}`;
    const requests = [
      owner.api.rpc("register_push_subscription_v1", {
        ...args, p_provider: "unbekannt" as typeof args.p_provider, p_credentials: credentials(),
      }),
      owner.api.rpc("register_push_subscription_v1", { ...args, p_credentials: { token } }),
      owner.api.rpc("register_push_subscription_v1", {
        ...args, p_provider: "web_push", p_credentials: { endpoint, p256dh: "synthetic", auth: "synthetic" },
      }),
    ];
    for (const { error } of await Promise.all(requests)) {
      expect(error?.code).toBe("22023");
      const serialized = JSON.stringify(error);
      expect(serialized.includes(token) || serialized.includes(endpoint)).toBe(false);
    }
  });

  it("verweigert Zugriff nach Entzug der Mitgliedschaft", async () => {
    const args = identity(home);
    const registration = { ...args, p_credentials: credentials() };
    expect((await other.api.rpc("register_push_subscription_v1", registration)).error?.code).toBeUndefined();
    const changed = await service.from("family_memberships").update({ status: "revoked" })
      .eq("family_id", home).eq("user_id", other.id).select("id").single();
    expect(changed.error?.code).toBeUndefined();

    expect((await other.api.rpc("register_push_subscription_v1", registration)).error?.code).toBe("42501");
    expect((await other.api.rpc("list_push_subscriptions_v1", { p_family_id: home })).error?.code).toBe("42501");
    expect((await other.api.rpc("revoke_push_subscription_v1", args)).error?.code).toBe("42501");
  });
});
