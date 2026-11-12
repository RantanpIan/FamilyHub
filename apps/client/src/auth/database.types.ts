export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      families: {
        Row: {
          id: string;
          name: string;
          status: "active" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          status?: "active" | "archived";
        };
        Update: {
          name?: string;
          status?: "active" | "archived";
        };
        Relationships: [];
      };
      family_members: {
        Row: {
          id: string;
          family_id: string;
          display_name: string;
          member_type: "adult" | "child";
          status: "active" | "inactive";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          display_name: string;
          member_type: "adult" | "child";
          status?: "active" | "inactive";
        };
        Update: {
          display_name?: string;
          status?: "active" | "inactive";
        };
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      family_memberships: {
        Row: {
          id: string;
          family_id: string;
          member_id: string;
          user_id: string;
          role: "family_admin" | "adult" | "child";
          status: "active" | "pending" | "revoked";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          member_id: string;
          user_id: string;
          role: "family_admin" | "adult" | "child";
          status?: "active" | "pending" | "revoked";
        };
        Update: {
          family_id?: string;
          member_id?: string;
          user_id?: string;
          role?: "family_admin" | "adult" | "child";
          status?: "active" | "pending" | "revoked";
        };
        Relationships: [
          {
            foreignKeyName: "family_memberships_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "family_memberships_member_family_fk";
            columns: ["member_id", "family_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id", "family_id"];
          },
        ];
      };
      family_creation_requests: {
        Row: {
          user_id: string;
          request_id: string;
          family_id: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          request_id: string;
          family_id?: string | null;
          created_at?: string;
        };
        Update: {
          family_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "family_creation_requests_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      family_invitations: {
        Row: {
          id: string;
          family_id: string;
          target_member_id: string;
          invited_email: string;
          role: "adult";
          token_hash: string;
          status: "pending" | "accepted" | "revoked" | "expired";
          invited_by: string;
          created_at: string;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          family_id: string;
          target_member_id: string;
          invited_email: string;
          role?: "adult";
          token_hash: string;
          status?: "pending" | "accepted" | "revoked" | "expired";
          invited_by: string;
          expires_at: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          status?: "pending" | "accepted" | "revoked" | "expired";
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "family_invitations_member_family_fk";
            columns: ["target_member_id", "family_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id", "family_id"];
          },
          {
            foreignKeyName: "family_invitations_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_events: {
        Row: {
          resource_id: string;
          family_id: string;
          resource_type: "calendar_event";
          title: string;
          is_all_day: boolean;
          starts_at: string | null;
          ends_at: string | null;
          start_date: string | null;
          end_date_exclusive: string | null;
          time_zone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          resource_id: string;
          family_id: string;
          resource_type?: "calendar_event";
          title: string;
          is_all_day?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          start_date?: string | null;
          end_date_exclusive?: string | null;
          time_zone: string;
        };
        Update: {
          title?: string;
          is_all_day?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          start_date?: string | null;
          end_date_exclusive?: string | null;
          time_zone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_resource_type_family_fk";
            columns: ["resource_id", "family_id", "resource_type"];
            isOneToOne: true;
            referencedRelation: "resources";
            referencedColumns: ["id", "family_id", "resource_type"];
          },
        ];
      };
      resources: {
        Row: {
          id: string;
          family_id: string;
          owner_member_id: string;
          resource_type: "calendar_event" | "school_item" | "import_artifact" | "task" | "document";
          visibility: "private" | "family";
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          owner_member_id: string;
          resource_type: "calendar_event" | "school_item" | "import_artifact" | "task" | "document";
          visibility?: "private" | "family";
        };
        Update: {
          family_id?: string;
          owner_member_id?: string;
          resource_type?: "calendar_event" | "school_item" | "import_artifact" | "task" | "document";
          visibility?: "private" | "family";
          version?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resources_family_id_fkey";
            columns: ["family_id"];
            isOneToOne: false;
            referencedRelation: "families";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resources_owner_member_family_fk";
            columns: ["owner_member_id", "family_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id", "family_id"];
          },
        ];
      };
      resource_grants: {
        Row: {
          id: string;
          resource_id: string;
          family_id: string;
          grantee_member_id: string;
          permission: "read";
          status: "active" | "revoked";
          created_at: string;
          updated_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          resource_id: string;
          family_id: string;
          grantee_member_id: string;
          permission?: "read";
          status?: "active" | "revoked";
          revoked_at?: string | null;
        };
        Update: {
          resource_id?: string;
          family_id?: string;
          grantee_member_id?: string;
          permission?: "read";
          status?: "active" | "revoked";
          updated_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "resource_grants_resource_family_fk";
            columns: ["resource_id", "family_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["id", "family_id"];
          },
          {
            foreignKeyName: "resource_grants_member_family_fk";
            columns: ["grantee_member_id", "family_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id", "family_id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          user_id: string;
          display_name: string;
          locale: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name: string;
          locale?: string;
          timezone?: string;
        };
        Update: {
          display_name?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_calendar_event: {
        Args: {
          p_family_id: string;
          p_title: string;
          p_is_all_day: boolean;
          p_starts_at: string | null;
          p_ends_at: string | null;
          p_start_date: string | null;
          p_end_date_exclusive: string | null;
          p_time_zone: string;
          p_visibility: "private" | "family";
          p_request_id: string;
        };
        Returns: string;
      };
      update_calendar_event: {
        Args: {
          p_resource_id: string;
          p_expected_version: number;
          p_title: string;
          p_is_all_day: boolean;
          p_starts_at: string | null;
          p_ends_at: string | null;
          p_start_date: string | null;
          p_end_date_exclusive: string | null;
          p_time_zone: string;
        };
        Returns: number;
      };
      delete_calendar_event: {
        Args: { p_resource_id: string; p_expected_version: number };
        Returns: boolean;
      };
      create_family: {
        Args: { p_name: string; p_request_id: string };
        Returns: {
          family_id: string;
          family_name: string;
          member_id: string;
          role: string;
        }[];
      };
      list_my_families: {
        Args: Record<PropertyKey, never>;
        Returns: {
          family_id: string;
          family_name: string;
          member_id: string;
          role: string;
        }[];
      };
      list_family_members: {
        Args: { p_family_id: string };
        Returns: {
          family_id: string;
          member_id: string;
          display_name: string;
          member_type: string;
          status: string;
          has_login: boolean;
        }[];
      };
      create_family_invitation: {
        Args: {
          p_family_id: string;
          p_target_member_id: string;
          p_invited_email: string;
        };
        Returns: {
          invitation_id: string;
          target_member_name: string;
          role: string;
          expires_at: string;
          invitation_token: string;
        }[];
      };
      list_family_memberships_admin: {
        Args: { p_family_id: string };
        Returns: {
          membership_id: string;
          member_id: string;
          role: string;
          status: string;
        }[];
      };
      list_family_invitations_admin: {
        Args: { p_family_id: string };
        Returns: {
          invitation_id: string;
          target_member_id: string;
          target_member_name: string;
          role: string;
          status: string;
          created_at: string;
          expires_at: string;
        }[];
      };
      preview_family_invitation: {
        Args: { p_token: string };
        Returns: {
          family_id: string;
          family_name: string;
          target_member_id: string;
          target_member_name: string;
          role: string;
          expires_at: string;
        }[];
      };
      accept_family_invitation: {
        Args: { p_token: string };
        Returns: { family_id: string }[];
      };
      revoke_family_invitation: {
        Args: { p_invitation_id: string };
        Returns: undefined;
      };
      deactivate_family_membership: {
        Args: { p_membership_id: string };
        Returns: undefined;
      };
      resource_actor_is_active_member: {
        Args: { p_family_id: string; p_member_id: string };
        Returns: boolean;
      };
      owns_resource: {
        Args: { p_resource_id: string };
        Returns: boolean;
      };
      can_read_resource: {
        Args: { p_resource_id: string };
        Returns: boolean;
      };
      can_update_resource: {
        Args: { p_resource_id: string };
        Returns: boolean;
      };
      can_delete_resource: {
        Args: { p_resource_id: string };
        Returns: boolean;
      };
      set_resource_visibility: {
        Args: {
          p_resource_id: string;
          p_visibility: "private" | "family";
          p_expected_version: number;
        };
        Returns: number;
      };
      grant_resource_read: {
        Args: { p_resource_id: string; p_grantee_member_id: string };
        Returns: string;
      };
      revoke_resource_read: {
        Args: { p_resource_id: string; p_grantee_member_id: string };
        Returns: boolean;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
