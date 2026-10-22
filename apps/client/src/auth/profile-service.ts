import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UserProfileSchema, type UserProfile } from "@familyhub/contracts";
import type { Database } from "./database.types";

function suggestedDisplayName(user: User): string {
  const metadataName = user.user_metadata["display_name"];
  if (
    typeof metadataName === "string" &&
    metadataName.trim().length > 0 &&
    metadataName.trim().length <= 80
  ) {
    return metadataName.trim();
  }

  return "FamilyHub-Mitglied";
}

async function readProfile(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await client
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? UserProfileSchema.parse(data) : null;
}

export async function ensureUserProfile(
  client: SupabaseClient<Database>,
  user: User,
): Promise<UserProfile> {
  const existing = await readProfile(client, user.id);
  if (existing) {
    return existing;
  }

  const { data, error } = await client
    .from("user_profiles")
    .insert({
      user_id: user.id,
      display_name: suggestedDisplayName(user),
    })
    .select("*")
    .single();

  if (error?.code === "23505") {
    const concurrentlyCreated = await readProfile(client, user.id);
    if (concurrentlyCreated) {
      return concurrentlyCreated;
    }
  }

  if (error) {
    throw error;
  }

  return UserProfileSchema.parse(data);
}
