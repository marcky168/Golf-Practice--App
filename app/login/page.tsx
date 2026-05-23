import { LoginForm } from "./LoginForm";

/**
 * Server component reads env at request time on Vercel.
 * NEXT_PUBLIC_* in client-only code is baked in at `next build` — if vars were
 * added to Vercel after the last build, the browser bundle still had `undefined`.
 */
export default function LoginPage() {
  return (
    <LoginForm
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
      supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
    />
  );
}
