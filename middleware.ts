import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function middleware(request: NextRequest) {
  try {
    const { supabaseResponse, user } = await updateSession(request);

    const pathname = request.nextUrl.pathname;

    // Public routes that don't require login
    const isPublicRoute =
      pathname.startsWith("/login") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/icons") ||
      pathname.includes(".");

    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (user && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (err) {
    // Last-resort safety net so a transient Supabase / edge runtime issue
    // never serves a hard 500 to a real user. The actual stack will appear
    // in Vercel function logs for follow-up.
    console.error("[middleware] uncaught error, passing through:", err);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
