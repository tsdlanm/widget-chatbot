"use client";
import Link from "next/link";

import { Bot, MessageSquarePlus } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

import * as React from "react";

import { Label, Pie, PieChart } from "recharts";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@workspace/ui/components/card";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";

const shortcuts = [
  {
    title: "Kelola Chatbots",
    description: "Lihat daftar bot, session, settings, dan embed code.",
    href: "/dashboard/chatbots",
    icon: Bot,
  },
  {
    title: "Buat Chatbot Baru",
    description: "Mulai dari nama, prompt, lalu langsung ke widget embed.",
    href: "/dashboard/chatbots/new",
    icon: MessageSquarePlus,
  },
] as const;

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

const PIE_COLORS = [
  "#2563eb",
  "#ea580c",
  "#16a34a",
  "#9333ea",
  "#db2777",
  "#0891b2",
  "#ca8a04",
  "#dc2626",
] as const;

export default function DashboardPage() {
  const rawStats = useQuery(api.chatbots.getDashboardStats) || [];

  const chartData = React.useMemo(() => {
    return rawStats.map((stat, i) => ({
      ...stat,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [rawStats]);

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      replies: { label: "Balasan LLM" },
      sessions: { label: "Sesi Valid" },
    };
    chartData.forEach((d, idx) => {
      config[d.botName] = {
        label: d.botName,
        color: d.fill,
      };
    });
    return config;
  }, [chartData]);

  const totalReplies = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.replies, 0);
  }, [chartData]);

  const totalSessions = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.sessions, 0);
  }, [chartData]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {shortcuts.map((item) => (
          <Card
            key={item.href}
            className="group transition hover:border-primary/50"
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {item.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <div className="px-6 pb-6">
              <Button asChild className="w-full">
                <Link href={item.href}>Buka</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left Pie Chart: LLM Replies */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Balasan LLM per Chatbot</CardTitle>
            <CardDescription>Total respons dari AI</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[250px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={chartData}
                  dataKey="replies"
                  nameKey="botName"
                  innerRadius={60}
                  minAngle={chartData.length > 1 ? 3 : 0}
                  paddingAngle={chartData.length > 1 ? 1 : 0}
                  strokeWidth={5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {totalReplies.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground"
                            >
                              Balasan
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="leading-none text-muted-foreground">
              Distribusi balasan AI berdasarkan chatbot
            </div>
          </CardFooter>
        </Card>

        {/* Right Pie Chart: Sessions */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Sesi Chat per Chatbot</CardTitle>
            <CardDescription>Total interaksi pengguna</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[250px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={chartData}
                  dataKey="sessions"
                  nameKey="botName"
                  innerRadius={60}
                  minAngle={chartData.length > 1 ? 3 : 0}
                  paddingAngle={chartData.length > 1 ? 1 : 0}
                  strokeWidth={5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {totalSessions.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground"
                            >
                              Sesi Chat
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="leading-none text-muted-foreground">
              Tingkat penggunaan tiap chatbot
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
