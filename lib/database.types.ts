/**
 * Hand-written to match schema.sql (no live Supabase project to generate
 * from at build time). If you evolve schema.sql, keep this in sync — or
 * regenerate properly later with:
 *   npx supabase gen types typescript --project-id <ref> > lib/database.types.ts
 *
 * `Relationships: []` on every table is required by @supabase/postgrest-js's
 * generic constraints even though we don't use embedded/joined selects here
 * (see lib/data.ts — plain queries, joined client-side where needed).
 */
import type { ExpenseData } from "@/lib/calc";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string; avatar_url: string | null; created_at: string };
        Insert: { id: string; display_name: string; avatar_url?: string | null };
        Update: { display_name?: string; avatar_url?: string | null };
        Relationships: [];
      };
      groups: {
        Row: { id: string; name: string; currency_default: string; created_by: string; created_at: string };
        Insert: { id?: string; name: string; currency_default?: string; created_by: string };
        Update: { name?: string; currency_default?: string };
        Relationships: [];
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string | null;
          display_name: string;
          avatar_url: string | null;
          role: "owner" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id?: string | null;
          display_name: string;
          avatar_url?: string | null;
          role?: "owner" | "member";
        };
        Update: { display_name?: string; avatar_url?: string | null; role?: "owner" | "member" };
        Relationships: [];
      };
      group_invites: {
        Row: {
          id: string;
          group_id: string;
          code: string;
          created_by: string;
          expires_at: string | null;
          revoked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          code: string;
          created_by: string;
          expires_at?: string | null;
          revoked?: boolean;
        };
        Update: { revoked?: boolean; expires_at?: string | null };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          group_id: string;
          title: string;
          date: string;
          location: string | null;
          currency: string;
          notes: string | null;
          receipt_url: string | null;
          data: ExpenseData;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          title: string;
          date: string;
          location?: string | null;
          currency?: string;
          notes?: string | null;
          receipt_url?: string | null;
          data: ExpenseData;
          created_by?: string | null;
          updated_at?: string;
        };
        Update: {
          title?: string;
          date?: string;
          location?: string | null;
          currency?: string;
          notes?: string | null;
          receipt_url?: string | null;
          data?: ExpenseData;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_group: { Args: { p_name: string; p_currency?: string }; Returns: string };
      redeem_invite: { Args: { p_code: string }; Returns: string };
      is_group_member: { Args: { gid: string }; Returns: boolean };
      is_group_owner: { Args: { gid: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
