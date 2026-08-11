import { createClient } from "@supabase/supabase-js";

const url =
  (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ?? "";
const key =
  (import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] as string | undefined) ??
  (import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined) ??
  "";

export const isSupabaseConfigured = Boolean(url && key);

/** Supabase browser client. Uses the credentials injected by the Supabase integration. */
export const supabase = createClient(url || "http://localhost", key || "public-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});