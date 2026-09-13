import { createClient } from "@supabase/supabase-js";

/**
 * Browser anon client. Do not use this for ctz_* reads/writes.
 * Business data goes through /api/* + createSupabaseServerClient() (service_role).
 * Kept so NEXT_PUBLIC_SUPABASE_ANON_KEY can remain available for benign uses.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
