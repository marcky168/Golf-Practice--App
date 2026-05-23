import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/supabase";

export function createClient(
  url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  if (!url || !key) {
    throw new Error(
      "Supabase client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createBrowserClient<Database>(url, key);
}
