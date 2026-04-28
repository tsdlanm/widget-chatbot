"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useConvexAuth, useQuery } from "convex/react";
import {
  Activity,
  ArrowLeft,
  ChevronDown,
  Code,
  Database,
  ExternalLink,
  MessageSquare,
  Settings,
} from "lucide-react";

import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

const tabItems = [
  { label: "Conversations", href: "conversations", icon: MessageSquare },
  { label: "Rate Limit", href: "rate-limit", icon: Activity },
  { label: "Knowledge", href: "knowledge", icon: Database },
  { label: "Settings", href: "settings", icon: Settings },
  { label: "Embed", href: "embed", icon: Code },
] as const;

export function ChatbotDetailShell({
  chatbotId,
  children,
}: {
  chatbotId: Id<"chatbots">;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const chatbot = useQuery(
    api.chatbots.getChatbot,
    isLoading || !isAuthenticated ? "skip" : { chatbotId }
  );

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Memuat autentikasi...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Anda belum terautentikasi.
      </div>
    );
  }

  if (chatbot === undefined) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Memuat chatbot...
      </div>
    );
  }

  const activeTab =
    tabItems.find((tab) => {
      const href = `/dashboard/chatbots/${chatbotId}/${tab.href}`;

      return pathname === href || pathname.startsWith(`${href}/`);
    }) ?? tabItems[0];

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/chatbots">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold">
              {chatbot.name}
              <Badge variant={chatbot.isActive ? "default" : "secondary"}>
                {chatbot.isActive ? "Aktif" : "Non-aktif"}
              </Badge>
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              Key: {chatbot.apiKey}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link
            href={`/preview/${chatbotId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Preview
            <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex h-11 w-full items-center justify-between rounded-xl px-4"
            >
              <span className="flex items-center gap-2">
                <activeTab.icon className="h-4 w-4" />
                {activeTab.label}
              </span>
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={8}
            className="w-(--radix-dropdown-menu-trigger-width) min-w-0 rounded-xl p-2"
          >
            <DropdownMenuLabel className="px-3 py-2 text-xs tracking-wide text-muted-foreground uppercase">
              Navigation
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tabItems.map((tab) => {
              const href = `/dashboard/chatbots/${chatbotId}/${tab.href}`;
              const isActive =
                pathname === href || pathname.startsWith(`${href}/`);

              return (
                <DropdownMenuItem key={tab.href} asChild>
                  <Link
                    href={href}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${isActive ? "font-medium text-foreground" : "text-muted-foreground"}`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="hidden w-full items-center border-b pt-2 pb-px sm:flex">
        {tabItems.map((tab) => {
          const href = `/dashboard/chatbots/${chatbotId}/${tab.href}`;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Button
              key={tab.href}
              asChild
              variant="ghost"
              className={`flex-1 rounded-md border-b-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-transparent ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Link href={href}>
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
              </Link>
            </Button>
          );
        })}
      </div>

      <div className="py-4">{children}</div>
    </div>
  );
}
