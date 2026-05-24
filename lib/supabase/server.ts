import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

type SupabaseServerClient = ReturnType<typeof createServerClient<Database>>;

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/** Server Supabase client. Returns `null` when env vars are not configured. */
export async function createClient(): Promise<SupabaseServerClient | null> {
  const env = getSupabaseEnv();
  if (!env) {
    console.warn(
      "[supabase/server] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — session refresh handled in proxy.ts
        }
      },
    },
  });
}

/** Verified user for layout/header; never throws. */
export async function getAuthUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  } catch (err) {
    // Expected when Next tries static analysis without a request (build-time prerender)
    const message = err instanceof Error ? err.message : String(err);
    const isDynamicUsage =
      message.includes("Dynamic server usage") ||
      (err instanceof Error && "digest" in err && err.digest === "DYNAMIC_SERVER_USAGE");
    if (!isDynamicUsage) {
      console.error("[supabase/server] getAuthUser failed:", err);
    }
    return null;
  }
}
