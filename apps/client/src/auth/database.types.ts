import type { PushProvider, PushSubscriptionRegistration } from "@familyhub/notifications-domain";

type PushSubscriptionArgs = {
  p_family_id: string;
  p_provider: PushProvider;
  p_subscription_key: string;
};

type PushSubscriptionRow = {
  family_id: string;
  user_id: string;
  provider: PushProvider;
  subscription_key: string;
  credentials: PushSubscriptionRegistration["credentials"];
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: PushSubscriptionRow;
        Update: Partial<PushSubscriptionRow>;
        Relationships: [];
      };
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
          status: "pending" | "accepted" | "declined" | "revoked" | "expired";
          invited_by: string;
          created_at: string;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
          revoked_at: string | null;
          declined_at: string | null;
          declined_by: string | null;
        };
        Insert: {
          id?: string;
          family_id: string;
          target_member_id: string;
          invited_email: string;
          role?: "adult";
          token_hash: string;
          status?: "pending" | "accepted" | "declined" | "revoked" | "expired";
          invited_by: string;
          expires_at: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          revoked_at?: string | null;
          declined_at?: string | null;
          declined_by?: string | null;
        };
        Update: {
          status?: "pending" | "accepted" | "declined" | "revoked" | "expired";
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          revoked_at?: string | null;
          declined_at?: string | null;
          declined_by?: string | null;
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
          subject_member_id: string | null;
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
          subject_member_id?: string | null;
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
          subject_member_id?: string | null;
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
            foreignKeyName: "calendar_events_subject_family_fk";
            columns: ["subject_member_id", "family_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id", "family_id"];
          },
          {
            foreignKeyName: "calendar_events_resource_type_family_fk";
            columns: ["resource_id", "family_id", "resource_type"];
            isOneToOne: true;
            referencedRelation: "resources";
            referencedColumns: ["id", "family_id", "resource_type"];
          },
        ];
      };
      calendar_series: {
        Row: {
          resource_id: string;
          family_id: string;
          subject_member_id: string | null;
          resource_type: "calendar_series";
          title: string;
          is_all_day: boolean;
          starts_at: string | null;
          ends_at: string | null;
          start_date: string | null;
          end_date_exclusive: string | null;
          time_zone: string;
          recurrence_rule: string;
          recurrence_frequency: "DAILY" | "WEEKLY" | "MONTHLY";
          recurrence_interval: number;
          recurrence_by_weekdays: number[] | null;
          recurrence_by_month_day: number | null;
          recurrence_count: number | null;
          recurrence_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          resource_id: string;
          family_id: string;
          subject_member_id?: string | null;
          resource_type?: "calendar_series";
          title: string;
          is_all_day?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          start_date?: string | null;
          end_date_exclusive?: string | null;
          time_zone: string;
          recurrence_rule: string;
          recurrence_frequency: "DAILY" | "WEEKLY" | "MONTHLY";
          recurrence_interval?: number;
          recurrence_by_weekdays?: number[] | null;
          recurrence_by_month_day?: number | null;
          recurrence_count?: number | null;
          recurrence_until?: string | null;
        };
        Update: {
          subject_member_id?: string | null;
          title?: string;
          is_all_day?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          start_date?: string | null;
          end_date_exclusive?: string | null;
          time_zone?: string;
          recurrence_rule?: string;
          recurrence_frequency?: "DAILY" | "WEEKLY" | "MONTHLY";
          recurrence_interval?: number;
          recurrence_by_weekdays?: number[] | null;
          recurrence_by_month_day?: number | null;
          recurrence_count?: number | null;
          recurrence_until?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_series_subject_family_fk";
            columns: ["subject_member_id", "family_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id", "family_id"];
          },
          {
            foreignKeyName: "calendar_series_resource_family_fk";
            columns: ["resource_id", "family_id", "resource_type"];
            isOneToOne: true;
            referencedRelation: "resources";
            referencedColumns: ["id", "family_id", "resource_type"];
          },
        ];
      };
      calendar_series_occurrences: {
        Row: {
          series_resource_id: string;
          family_id: string;
          occurrence_key: string;
          local_start: string | null;
          local_end: string | null;
          starts_at: string | null;
          ends_at: string | null;
          start_date: string | null;
          end_date_exclusive: string | null;
          created_at: string;
        };
        Insert: {
          series_resource_id: string;
          family_id: string;
          occurrence_key: string;
          local_start?: string | null;
          local_end?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          start_date?: string | null;
          end_date_exclusive?: string | null;
        };
        Update: {
          local_start?: string | null;
          local_end?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          start_date?: string | null;
          end_date_exclusive?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_series_occurrence_series_fk";
            columns: ["series_resource_id", "family_id"];
            isOneToOne: false;
            referencedRelation: "calendar_series";
            referencedColumns: ["resource_id", "family_id"];
          },
        ];
      };
      calendar_series_exceptions: {
        Row: {
          series_resource_id: string;
          family_id: string;
          occurrence_key: string;
          exception_version: number;
          is_cancelled: boolean;
          title: string | null;
          is_all_day: boolean | null;
          starts_at: string | null;
          ends_at: string | null;
          start_date: string | null;
          end_date_exclusive: string | null;
          time_zone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          series_resource_id: string;
          family_id: string;
          occurrence_key: string;
          exception_version?: number;
          is_cancelled?: boolean;
          title?: string | null;
          is_all_day?: boolean | null;
          starts_at?: string | null;
          ends_at?: string | null;
          start_date?: string | null;
          end_date_exclusive?: string | null;
          time_zone?: string | null;
        };
        Update: {
          exception_version?: number;
          is_cancelled?: boolean;
          title?: string | null;
          is_all_day?: boolean | null;
          starts_at?: string | null;
          ends_at?: string | null;
          start_date?: string | null;
          end_date_exclusive?: string | null;
          time_zone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_series_exception_series_fk";
            columns: ["series_resource_id", "family_id"];
            isOneToOne: false;
            referencedRelation: "calendar_series";
            referencedColumns: ["resource_id", "family_id"];
          },
        ];
      };
      resources: {
        Row: {
          id: string;
          family_id: string;
          owner_member_id: string;
          resource_type: "calendar_event" | "calendar_series" | "school_item" | "import_artifact" | "task" | "document";
          visibility: "private" | "family";
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          owner_member_id: string;
          resource_type: "calendar_event" | "calendar_series" | "school_item" | "import_artifact" | "task" | "document";
          visibility?: "private" | "family";
        };
        Update: {
          family_id?: string;
          owner_member_id?: string;
          resource_type?: "calendar_event" | "calendar_series" | "school_item" | "import_artifact" | "task" | "document";
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
      resolve_calendar_recipients_v1: {
        Args: {
          p_resource_id: string;
          p_kind: "all" | "selected_members";
          p_member_ids?: string[];
        };
        Returns: { member_id: string; user_id: string }[];
      };
      register_push_subscription_v1: {
        Args: PushSubscriptionArgs & { p_credentials: PushSubscriptionRow["credentials"] };
        Returns: undefined;
      };
      revoke_push_subscription_v1: {
        Args: PushSubscriptionArgs;
        Returns: undefined;
      };
      list_push_subscriptions_v1: {
        Args: { p_family_id: string };
        Returns: { provider: PushProvider; subscription_key: string }[];
      };
      create_calendar_event_for_member: {
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
          p_subject_member_id: string;
        };
        Returns: string;
      };
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
      create_calendar_series_for_member: {
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
          p_subject_member_id: string;
          p_recurrence_rule: string;
        };
        Returns: string;
      };
      update_calendar_series: {
        Args: {
          p_resource_id: string;
          p_expected_version: number;
          p_request_id: string;
          p_title: string;
          p_is_all_day: boolean;
          p_starts_at: string | null;
          p_ends_at: string | null;
          p_start_date: string | null;
          p_end_date_exclusive: string | null;
          p_time_zone: string;
          p_recurrence_rule: string;
        };
        Returns: number;
      };
      split_calendar_series: {
        Args: {
          p_resource_id: string;
          p_expected_version: number;
          p_request_id: string;
          p_effective_date: string;
          p_new_recurrence_rule: string;
        };
        Returns: string;
      };
      set_calendar_series_exception: {
        Args: {
          p_series_resource_id: string;
          p_occurrence_key: string;
          p_request_id: string;
          p_expected_series_version: number;
          p_expected_exception_version: number;
          p_action: "override" | "cancel";
          p_title: string | null;
          p_is_all_day: boolean | null;
          p_starts_at: string | null;
          p_ends_at: string | null;
          p_start_date: string | null;
          p_end_date_exclusive: string | null;
          p_time_zone: string | null;
        };
        Returns: number;
      };
      delete_calendar_series_exception: {
        Args: {
          p_series_resource_id: string;
          p_occurrence_key: string;
          p_request_id: string;
          p_expected_series_version: number;
          p_expected_exception_version: number;
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
      list_my_pending_family_invitations: {
        Args: Record<string, never>;
        Returns: {
          invitation_id: string;
          family_id: string;
          family_name: string;
          target_member_id: string;
          target_member_name: string;
          role: string;
          expires_at: string;
        }[];
      };
      respond_to_family_invitation: {
        Args: { p_invitation_id: string; p_decision: string };
        Returns: { family_id: string | null; decision: string }[];
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


