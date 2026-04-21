"use client";
import { SignInButton } from "@clerk/nextjs";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import { useModeToggle } from "@/components/theme-provider";
import { Moon, Sun, ChevronRight } from "lucide-react";

export default function Home() {
  const { resolvedTheme, toggle } = useModeToggle();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
