export type AppRole = "editor" | "read_only";

export interface AppUserAccess {
  id: string;
  email: string;
  role: AppRole;
  created_at?: string;
  updated_at?: string;
  invited_by_email?: string | null;
}
