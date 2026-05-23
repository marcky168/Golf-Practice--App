import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session for an incoming request and returns the
 * decoded user (or `null` if no valid session / Supabase is unconfigured).
 *
 * Defensive against:
 * - Missing env vars (returns `user: null` instead of throwing)
 * - Stale / malformed auth cookies left over from older @supabase/ssr versions
 *   (clears them so the next request starts clean)
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars aren't available at runtime (e.g. not set in Vercel, or this
  // is a preview deploy without env), don't crash the edge middleware.
  // Render pages as anonymous so the app degrades gracefully.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[supabase/proxy] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — middleware running anonymous"
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

    // IMPORTANT: Do not run code between client creation and getUser().
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { supabaseResponse, user };
  } catch (err) {
    // Most common cause: stale auth cookies from an older @supabase/ssr
    // encoding that the new version can't decode. Clearing them lets the
    // user log back in on the next request.
    console.error("[supabase/proxy] auth refresh failed:", err);
    const cleared = NextResponse.next({ request });
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        cleared.cookies.delete(cookie.name);
      }
    }
    return { supabaseResponse: cleared, user: null };
  }
}
