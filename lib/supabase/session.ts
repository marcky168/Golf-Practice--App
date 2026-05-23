import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session for an incoming request and returns the
 * decoded user (or `null` if no valid session / Supabase is unconfigured).
 *
 * Used by the Next.js `proxy.ts` (formerly middleware) at the network edge.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[supabase/session] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — running anonymous"
    );
    return { supabaseResponse, user: null };
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { supabaseResponse, user };
  } catch (err) {
    console.error("[supabase/session] auth refresh failed:", err);
    const cleared = NextResponse.next({ request });
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        cleared.cookies.delete(cookie.name);
      }
    }
    return { supabaseResponse: cleared, user: null };
  }
}
