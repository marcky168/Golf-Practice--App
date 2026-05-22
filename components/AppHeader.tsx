"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Target, LogOut, User, Settings } from "lucide-react";
import { signOut } from "@/app/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { InstallAppButton } from "./PwaRegister";

interface AppHeaderProps {
  userEmail?: string | null;
}

export function AppHeader({ userEmail }: AppHeaderProps) {
  const router = useRouter();

  // Hide header on login page for a cleaner experience
  if (typeof window !== "undefined" && window.location.pathname === "/login") {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="bg-primary sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold tracking-tight text-xl text-primary-foreground">Golf Practice OS</div>
            <div className="text-[10px] text-primary-foreground/60 -mt-1">DELIBERATE RANGE WORK</div>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <InstallAppButton />

          {userEmail ? (
            <>
              <Link
                href="/profile"
                className="hidden md:flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-primary-foreground transition"
              >
                <User className="h-4 w-4" />
                <span className="max-w-[140px] truncate">{userEmail}</span>
              </Link>
              <Link href="/profile" className="md:hidden">
                <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 px-2">
                  <User className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="secondary">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
