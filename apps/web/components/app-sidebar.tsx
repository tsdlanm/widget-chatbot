"use client";

import type { ComponentProps } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Bot,
  LayoutDashboard,
  MessageSquarePlus,
  MessagesSquare,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Chatbots", href: "/dashboard/chatbots", icon: MessagesSquare },
  {
    title: "Buat Chatbot",
    href: "/dashboard/chatbots/new",
    icon: MessageSquarePlus,
  },
] as const;

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const dashboardItem = navItems[0];
  const childItems = [...navItems.slice(1)].sort(
    (a, b) => b.href.length - a.href.length
  );

  const activeItem =
    pathname === dashboardItem.href
      ? dashboardItem
      : (childItems.find(
          (item) =>
            pathname === item.href || pathname.startsWith(`${item.href}/`)
        ) ?? null);

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b px-3 py-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm leading-5 font-semibold">Chat Widget</div>
            <div className="text-xs text-muted-foreground">Dashboard</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = activeItem?.href === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
