"use client";

import Link from "next/link";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Copy, Plus, Settings, Trash2, Check } from "lucide-react";
import * as React from "react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default function ChatbotsPage() {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const { isLoading, isAuthenticated } = useConvexAuth();
  const chatbots = useQuery(
    api.chatbots.listChatbots,
    isLoading || !isAuthenticated ? "skip" : {}
  );
  const deleteChatbot = useMutation(api.chatbots.deleteChatbot);

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

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
          {chatbots.map((bot) => (
            <Card
              key={bot._id}
              className="group relative flex flex-col overflow-hidden"
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
                <CardDescription className="mt-2 line-clamp-2">
                  {bot.systemPrompt}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex items-center justify-between rounded-md bg-muted p-2 text-sm transition group-hover:bg-muted/80">
                  <code className="mr-2 truncate font-mono text-xs text-muted-foreground">
                    {bot.apiKey}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 rounded-md transition-all hover:bg-background"
                    onClick={() => copyApiKey(bot.apiKey)}
                    title={
                      copiedKey === bot.apiKey ? "Tersalin!" : "Copy API Key"
                    }
                  >
                    {copiedKey === bot.apiKey ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="mt-auto flex gap-2">
                <Button asChild variant="secondary" className="flex-1">
                  <Link href={`/dashboard/chatbots/${bot._id}/settings`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Kelola
                  </Link>
                </Button>
                {deletingId === bot._id ? (
                  <div className="flex animate-in gap-1 fade-in slide-in-from-right-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        deleteChatbot({ chatbotId: bot._id });
                        setDeletingId(null);
                      }}
                    >
                      Yakin
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingId(null)}
                    >
                      Batal
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setDeletingId(bot._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
