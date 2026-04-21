"use client";
import { SignInButton, useClerk } from "@clerk/nextjs";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { useModeToggle } from "@/components/theme-provider";
import { Moon, Sun, ChevronRight, ShieldX } from "lucide-react";

export default function HomeContent() {
  const { resolvedTheme, toggle } = useModeToggle();
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const isUnauthorized = searchParams.get("unauthorized") === "true";
  const { signOut } = useClerk();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Jika unauthorized, sign out lalu bersihkan URL
  // Gunakan state agar alert tetap tampil setelah sign out
  const [showUnauthorizedAlert, setShowUnauthorizedAlert] = useState(false);

  useEffect(() => {
    if (isUnauthorized) {
      setShowUnauthorizedAlert(true);
      // Sign out user dan bersihkan URL (tanpa ?unauthorized=true)
      signOut().then(() => {
        // Ganti URL tanpa reload agar ?unauthorized=true hilang
        window.history.replaceState({}, "", "/");
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- hanya jalan sekali saat mount

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl items-center justify-center">
        <div className="w-full max-w-130">
          <div className="mb-8 flex justify-start">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="size-9 rounded-full border border-transparent bg-transparent p-0 text-foreground transition-all duration-300 ease-out hover:-translate-y-0.5 hover:rotate-6 hover:bg-muted/50 active:translate-y-0 active:scale-95"
              aria-label="Toggle theme"
            >
              {!mounted ? (
                <Moon className="size-6" />
              ) : resolvedTheme === "dark" ? (
                <Sun className="size-6" />
              ) : (
                <Moon className="size-6" />
              )}
            </Button>
          </div>

          {showUnauthorizedAlert && (
            <Alert variant="destructive" className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <ShieldX className="h-4 w-4" />
              <AlertDescription>
                Akun tidak diizinkan untuk mengakses dashboard.
              </AlertDescription>
            </Alert>
          )}

          <Authenticated>
            <div className="grid gap-6 text-left">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Chatbot - Widget
              </h1>
              <Button
                asChild
                className="h-16 w-full rounded-2xl text-xl font-semibold transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.14)] active:translate-y-0 active:scale-[0.98]"
              >
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>Need help?</span>
                <Link
                  href="/support"
                  className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-foreground/80"
                >
                  Contact support
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>
          </Authenticated>

          <Unauthenticated>
            <div className="grid gap-6 text-left">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Chatbot - Widget
              </h1>
              <p className="text-lg text-muted-foreground">
                You are signed out.
              </p>

              <SignInButton mode="modal">
                <Button className="h-16 w-full rounded-2xl bg-[#1f1f1f] text-xl font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-[#2a2a2a] hover:shadow-[0_18px_42px_rgba(0,0,0,0.22)] active:translate-y-0 active:scale-[0.98] dark:bg-[#f5f5f5] dark:text-[#111111] dark:hover:bg-white">
                  Sign In
                </Button>
              </SignInButton>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>Need help?</span>
                <Link
                  href="/support"
                  className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-foreground/80"
                >
                  Contact support
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>
          </Unauthenticated>

          <AuthLoading>
            <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/70 px-5 py-4 text-sm text-muted-foreground shadow-sm backdrop-blur-sm">
              <Spinner />
              <p>Loading auth state...</p>
            </div>
          </AuthLoading>
        </div>
      </div>
    </main>
  );
}
