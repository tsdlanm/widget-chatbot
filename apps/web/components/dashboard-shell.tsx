"use client";

import type { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import { Moon, Sun } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { useModeToggle } from "@/components/theme-provider";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";

export function DashboardShell({ children }: { children: ReactNode }) {
  const { resolvedTheme, toggle } = useModeToggle();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="text-sm font-medium text-muted-foreground">
            Workspace Dashboard
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun /> : <Moon />}
            </Button>
            <UserButton />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
