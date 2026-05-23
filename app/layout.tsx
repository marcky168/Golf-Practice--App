import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { PwaRegister } from "@/components/PwaRegister";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { getAuthUser } from "@/lib/supabase/server";

// Clean, highly legible system font stack optimized for mobile outdoors
const fontClass = "font-sans";

export const metadata: Metadata = {
  title: "Golf Practice OS",
  description: "Deliberate, focused golf practice. Block • Random • Games. Built for the range.",
  applicationName: "Golf Practice OS",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0F5132",
  colorScheme: "light dark",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontClass} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <PwaRegister />
          <AppHeader userEmail={user?.email} />
          {children}
          <BottomNav />
          <Toaster 
            position="top-center" 
            richColors 
            closeButton 
            className="font-sans"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
