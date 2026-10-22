import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../apps/client/src/auth/database.types";

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `RLS-Integrationstests benötigen ${name} einer lokalen, wegwerfbaren Supabase-Instanz.`,
    );
  }
  return value;
}

const supabaseUrl = requiredEnvironmentVariable("SUPABASE_TEST_URL");
const anonKey = requiredEnvironmentVariable("SUPABASE_TEST_ANON_KEY");
const serviceRoleKey = requiredEnvironmentVariable("SUPABASE_TEST_SERVICE_ROLE_KEY");
type TestClient = SupabaseClient<Database, "public">;

const adminClient = createClient<Database, "public">(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userA: { id: string; email: string };
let userB: { id: string; email: string };
let clientA: TestClient;
let clientB: TestClient;
const profileBDisplayName = "Synthetic B profile";
const temporaryUserIds: string[] = [];

async function createSyntheticUser(
  client: TestClient,
  email: string,
  displayName: string,
) {
  const { data, error } = await client.auth.admin.createUser({
    email,
    password: "Synthetic-Test-Password-Only-2026!",
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (error || !data.user) {
    throw error ?? new Error("Supabase Auth lieferte keinen synthetischen Testnutzer.");
  }

  return { id: data.user.id, email };
}

async function createUserClient(email: string): Promise<TestClient> {
  const client = createClient<Database, "public">(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: "Synthetic-Test-Password-Only-2026!",
  });
  if (error) {
    throw error;
  }
  return client;
}

beforeAll(async () => {
  const suffix = randomUUID();
  userA = await createSyntheticUser(
    adminClient,
    `fh-cx-003-${suffix}-a@example.com`,
    "Synthetic A profile",
  );
  userB = await createSyntheticUser(
    adminClient,
    `fh-cx-003-${suffix}-b@example.com`,
    profileBDisplayName,
  );
  clientA = await createUserClient(userA.email);
  clientB = await createUserClient(userB.email);

  const { error: insertAError } = await clientA.from("user_profiles").insert({
    user_id: userA.id,
    display_name: "Synthetic A profile",
  });
  if (insertAError) {
    throw insertAError;
  }

  const { error: insertBError } = await clientB.from("user_profiles").insert({
    user_id: userB.id,
    display_name: profileBDisplayName,
  });
  if (insertBError) {
    throw insertBError;
  }
});

afterAll(async () => {
  for (const userId of temporaryUserIds) {
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      throw error;
    }
  }
  if (userA) {
    const { error } = await adminClient.auth.admin.deleteUser(userA.id);
    if (error) {
      throw error;
    }
  }
  if (userB) {
    const { error } = await adminClient.auth.admin.deleteUser(userB.id);
    if (error) {
      throw error;
    }
  }
});

describe("user_profiles PostgreSQL RLS", () => {
  it("AUTH-T01, T02: signup waits for email confirmation and accepts the configured callback", async () => {
    const email = `fh-cx-003-signup-${randomUUID()}@example.com`;
    const password = "Synthetic-Signup-Password-Only-2026!";
    const redirectTo = "http://127.0.0.1:5173/auth?flow=email-confirmation";
    const signupClient = createClient<Database, "public">(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const signup = await signupClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { display_name: "Synthetic signup profile" },
      },
    });

    expect(signup.error).toBeNull();
    expect(signup.data.user).not.toBeNull();
    expect(signup.data.session).toBeNull();
    const createdUserId = signup.data.user?.id;
    if (!createdUserId) {
      throw new Error("Supabase Auth lieferte keinen synthetischen Signup-Nutzer.");
    }
    temporaryUserIds.push(createdUserId);

    const pendingUser = await adminClient.auth.admin.getUserById(createdUserId);
    expect(pendingUser.error).toBeNull();
    if (!pendingUser.data.user) {
      throw new Error("Supabase Auth konnte den synthetischen Nutzer nicht laden.");
    }
    expect(pendingUser.data.user.email_confirmed_at).toBeFalsy();

    const confirmation = await adminClient.auth.admin.updateUserById(createdUserId, {
      email_confirm: true,
    });
    expect(confirmation.error).toBeNull();

    const signedIn = await signupClient.auth.signInWithPassword({ email, password });
    expect(signedIn.error).toBeNull();
    expect(signedIn.data.session).not.toBeNull();
  });

  it("AUTH-T09: a user can change their own display name", async () => {
    const nextDisplayName = "Synthetic A profile updated";
    const { data, error } = await clientA
      .from("user_profiles")
      .update({ display_name: nextDisplayName })
      .eq("user_id", userA.id)
      .select("*")
      .single();

    expect(error).toBeNull();
    expect(data?.display_name).toBe(nextDisplayName);
  });

  it("AUTH-T10: a user cannot read another user's profile", async () => {
    const { data, error } = await clientA
      .from("user_profiles")
      .select("*")
      .eq("user_id", userB.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("AUTH-T03, T04, T06: sign-in rejects a bad password and local sign-out clears the session", async () => {
    const authClient = createClient<Database, "public">(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const wrongPassword = await authClient.auth.signInWithPassword({
      email: userA.email,
      password: "Definitely-Wrong-Synthetic-Password!",
    });
    expect(wrongPassword.error).not.toBeNull();

    const successfulSignIn = await authClient.auth.signInWithPassword({
      email: userA.email,
      password: "Synthetic-Test-Password-Only-2026!",
    });
    expect(successfulSignIn.error).toBeNull();
    expect(successfulSignIn.data.session).not.toBeNull();

    const signOut = await authClient.auth.signOut({ scope: "local" });
    expect(signOut.error).toBeNull();
    const { data } = await authClient.auth.getSession();
    expect(data.session).toBeNull();
  });

  it("AUTH-T11: a user cannot change another user's profile", async () => {
    const attemptedName = "Unauthorized synthetic profile change";
    const { data, error } = await clientA
      .from("user_profiles")
      .update({ display_name: attemptedName })
      .eq("user_id", userB.id)
      .select("*");

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: profile, error: readError } = await adminClient
      .from("user_profiles")
      .select("display_name")
      .eq("user_id", userB.id)
      .single();

    expect(readError).toBeNull();
    expect(profile?.display_name).toBe(profileBDisplayName);
    expect(profile?.display_name).not.toBe(attemptedName);
  });

  it("AUTH-T11: a user cannot change the user_id column on their own profile", async () => {
    const { data } = await clientA.auth.getSession();
    const accessToken = data.session?.access_token;
    expect(accessToken).toBeTruthy();

    const response = await fetch(
      `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userA.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ user_id: userB.id }),
      },
    );

    expect(response.ok).toBe(false);

    const { data: profile, error } = await adminClient
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", userA.id)
      .single();
    expect(error).toBeNull();
    expect(profile?.user_id).toBe(userA.id);
  });

  it("AUTH-T12: a profile can be created only once per Auth account", async () => {
    const { error } = await clientA.from("user_profiles").insert({
      user_id: userA.id,
      display_name: "Duplicate synthetic profile",
    });

    expect(error?.code).toBe("23505");
  });
});
