import type { Database } from "@/lib/database.types";

export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"];
export type GroupInvite = Database["public"]["Tables"]["group_invites"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
