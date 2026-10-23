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
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
