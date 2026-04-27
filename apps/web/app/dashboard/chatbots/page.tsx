"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import * as React from "react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default function ChatbotsPage() {
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const chatbots = useQuery(
    api.chatbots.listChatbots,
    isLoading || !isAuthenticated ? "skip" : {}
  );
  const deleteChatbot = useMutation(api.chatbots.deleteChatbot);

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

  if (chatbots === undefined) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Memuat chatbots...
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chatbots</h1>
          <p className="text-muted-foreground">
            Kelola asisten AI widget Anda di sini.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/chatbots/new">
            <Plus className="mr-2 h-4 w-4" />
            Buat Chatbot Baru
          </Link>
        </Button>
      </div>

      {chatbots.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <div className="mb-4 text-muted-foreground">
            Anda belum memiliki chatbot.
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/chatbots/new">Buat Sekarang</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {chatbots.map((bot) => {
            const botWithActivity = bot as typeof bot & {
              lastActiveAt?: number;
            };
            const lastActiveLabel =
              typeof botWithActivity.lastActiveAt === "number"
                ? new Date(botWithActivity.lastActiveAt).toLocaleString("id-ID")
                : "Belum ada aktivitas";

            return (
              <Card
                key={bot._id}
                className="group relative flex cursor-pointer flex-col overflow-hidden transition hover:border-primary/50"
                role="link"
                tabIndex={0}
                onClick={() =>
                  router.push(`/dashboard/chatbots/${bot._id}/settings`)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/dashboard/chatbots/${bot._id}/settings`);
                  }
                }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="truncate pr-4 text-xl">
                      {bot.name}
                    </CardTitle>
                    <Badge variant={bot.isActive ? "default" : "secondary"}>
                      {bot.isActive ? "Aktif" : "Non-aktif"}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2 space-y-1 text-sm">
                    <p>
                      Domain: {bot.allowedDomain || "Belum disetel"}
                    </p>
                    <p>Aktif terakhir: {lastActiveLabel}</p>
                  </CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto">
                  {deletingId === bot._id ? (
                    <div
                      className="flex w-full animate-in gap-2 fade-in slide-in-from-right-4"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          deleteChatbot({ chatbotId: bot._id });
                          setDeletingId(null);
                        }}
                      >
                        Yakin
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setDeletingId(null)}
                      >
                        Batal
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeletingId(bot._id);
                      }}
                    >
                      Hapus
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
