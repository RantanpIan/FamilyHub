import {
  CreateResourceInputSchema,
  GrantResourceReadInputSchema,
  ResourceGrantIdSchema,
  ResourceGrantSchema,
  ResourceIdSchema,
  ResourceSchema,
  SetResourceVisibilityInputSchema,
  type CreateResourceInput,
  type GrantResourceReadInput,
  type Resource,
  type ResourceGrantId,
  type ResourceGrant,
  type ResourceVisibility,
} from "@familyhub/contracts";
import { browserAuthConfig } from "../auth/auth-client";

function requireClient() {
  if (!browserAuthConfig.configured) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }
  return browserAuthConfig.client;
}

export async function createResource(input: CreateResourceInput): Promise<Resource> {
  const parsed = CreateResourceInputSchema.parse(input);
  const { data, error } = await requireClient()
    .from("resources")
    .insert({
      family_id: parsed.familyId,
      owner_member_id: parsed.ownerMemberId,
      resource_type: parsed.resourceType,
      visibility: parsed.visibility,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }
  return ResourceSchema.parse(data);
}

export async function getReadableResource(
  resourceId: string,
): Promise<Resource | null> {
  const id = ResourceIdSchema.parse(resourceId);
  const { data, error } = await requireClient()
    .from("resources")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data ? ResourceSchema.parse(data) : null;
}

export async function ownsResource(resourceId: string): Promise<boolean> {
  const id = ResourceIdSchema.parse(resourceId);
  const { data, error } = await requireClient().rpc("owns_resource", {
    p_resource_id: id,
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function canReadResource(resourceId: string): Promise<boolean> {
  const id = ResourceIdSchema.parse(resourceId);
  const { data, error } = await requireClient().rpc("can_read_resource", {
    p_resource_id: id,
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function canUpdateResource(resourceId: string): Promise<boolean> {
  const id = ResourceIdSchema.parse(resourceId);
  const { data, error } = await requireClient().rpc("can_update_resource", {
    p_resource_id: id,
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function canDeleteResource(resourceId: string): Promise<boolean> {
  const id = ResourceIdSchema.parse(resourceId);
  const { data, error } = await requireClient().rpc("can_delete_resource", {
    p_resource_id: id,
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function setResourceVisibility(input: {
  resourceId: string;
  visibility: ResourceVisibility;
  expectedVersion: number;
}): Promise<number> {
  const parsed = SetResourceVisibilityInputSchema.parse(input);
  const { data, error } = await requireClient().rpc("set_resource_visibility", {
    p_resource_id: parsed.resourceId,
    p_visibility: parsed.visibility,
    p_expected_version: parsed.expectedVersion,
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function grantResourceRead(
  input: GrantResourceReadInput,
): Promise<ResourceGrantId> {
  const parsed = GrantResourceReadInputSchema.parse(input);
  const { data, error } = await requireClient().rpc("grant_resource_read", {
    p_resource_id: parsed.resourceId,
    p_grantee_member_id: parsed.granteeMemberId,
  });
  if (error) {
    throw error;
  }
  return ResourceGrantIdSchema.parse(data);
}

export async function listResourceGrants(
  resourceId: string,
): Promise<ResourceGrant[]> {
  const id = ResourceIdSchema.parse(resourceId);
  const { data, error } = await requireClient()
    .from("resource_grants")
    .select("*")
    .eq("resource_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }
  return data.map((grant) => ResourceGrantSchema.parse(grant));
}

export async function revokeResourceRead(
  input: GrantResourceReadInput,
): Promise<boolean> {
  const parsed = GrantResourceReadInputSchema.parse(input);
  const { data, error } = await requireClient().rpc("revoke_resource_read", {
    p_resource_id: parsed.resourceId,
    p_grantee_member_id: parsed.granteeMemberId,
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function deleteResource(resourceId: string): Promise<void> {
  const id = ResourceIdSchema.parse(resourceId);
  const { data, error } = await requireClient()
    .from("resources")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("Ressource nicht gefunden oder keine Berechtigung zum Löschen.");
  }
}
