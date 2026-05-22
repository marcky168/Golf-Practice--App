"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { signIn, signUp } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);

    try {
      if (mode === "signin") {
        const res = await signIn(email, password);
        if (res.success) {
          toast.success("Welcome back!");

          // Redirect to the page the user was trying to access (or home)
          const params = new URLSearchParams(window.location.search);
          const next = params.get("next") || "/";
          router.push(next);
          router.refresh();
        } else {
          toast.error(res.error || "Sign in failed");
        }
      } else {
        const res = await signUp(email, password);
        if (res.success) {
          toast.success(res.message || "Account created! Check your email.");
          setMode("signin");
        } else {
          toast.error(res.error || "Sign up failed");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const supabase = createClient();

    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      toast.error("Google sign in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F2E9] via-[#F8F5EB] to-[#F5F2E9] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-5 py-8 sm:py-12">
        <div className="w-full max-w-[420px]">
          {/* Logo + Branding */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-4 shadow-sm">
              <Target className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="font-semibold text-2xl tracking-tighter">Golf Practice OS</div>
            <div className="text-xs text-muted-foreground tracking-[2px] mt-0.5">DELIBERATE RANGE WORK</div>
          </div>

          {/* Heading */}
          <div className="text-center mb-7">
            <h1 className="text-3xl font-semibold tracking-tighter">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-muted-foreground mt-2 text-[15px]">
              {mode === "signin"
                ? "Sign in to continue your practice journey."
                : "Start building better habits on the range."}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-border rounded-3xl p-7 sm:p-8 shadow-xl shadow-black/5">
            {/* Google Button - Prominent */}
            <Button
              variant="outline"
              className="w-full h-14 text-base font-medium mb-6 active:scale-[0.985]"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-muted-foreground tracking-widest">
                  OR WITH EMAIL
                </span>
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-sm mb-1.5 block text-muted-foreground">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="h-12 text-base"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm mb-1.5 block text-muted-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="h-12 text-base"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-base font-semibold mt-2 active:scale-[0.985]"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
              </Button>
            </form>

            <div className="text-center mt-6 text-sm">
              {mode === "signin" ? (
                <>
                  Don’t have an account?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="font-medium text-primary hover:underline active:text-primary/80"
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setMode("signin")}
                    className="font-medium text-primary hover:underline active:text-primary/80"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Your practice data stays private and is only visible to you.
          </p>
        </div>
      </div>
    </div>
  );
}
