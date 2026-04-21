"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function ConversationViewer({
  conversationId,
}: {
  conversationId: Id<"conversations">;
}) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const conversation = useQuery(
    api.conversations.getConversation,
    isLoading || !isAuthenticated ? "skip" : { conversationId }
  );
  const messages = useQuery(
    api.conversations.getMessages,
    isLoading || !isAuthenticated ? "skip" : { conversationId }
  );

  if (isLoading) {
    return (
      <div className="py-4 text-center text-sm">Memuat autentikasi...</div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="py-4 text-center text-sm">Anda belum terautentikasi.</div>
    );
  }

  if (conversation === undefined || messages === undefined) {
    return <div className="py-4 text-center text-sm">Memuat pesan...</div>;
  }

  const metadata = conversation.metadata;
  const viewportSize =
    metadata.visitorViewportWidth && metadata.visitorViewportHeight
      ? `${metadata.visitorViewportWidth} x ${metadata.visitorViewportHeight}`
      : "Tidak tersedia";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b py-3">
          <CardTitle className="border-0 text-base">Profil Session</CardTitle>
          <CardDescription className="text-xs">
            Informasi yang ditangkap otomatis dari widget dan dipakai untuk
            monitoring.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Nama pengunjung</p>
            <p className="font-medium">
              {metadata.visitorName?.trim() || "Belum diisi"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Session ID</p>
            <p className="font-mono text-sm">{conversation.sessionId}</p>
          </div>
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs text-muted-foreground">URL halaman</p>
            <p className="truncate text-sm">
              {metadata.visitorUrl || "Tidak tersedia"}
            </p>
          </div>
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs text-muted-foreground">Referrer</p>
            <p className="truncate text-sm">
              {metadata.visitorReferrer || "Tidak tersedia"}
            </p>
          </div>
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs text-muted-foreground">Browser agent</p>
            <p className="text-sm wrap-break-word">
              {metadata.visitorAgent || "Tidak tersedia"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Bahasa</p>
            <Badge variant="outline">
              {metadata.visitorLanguage || "Tidak tersedia"}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Timezone</p>
            <Badge variant="outline">
              {metadata.visitorTimezone || "Tidak tersedia"}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Platform</p>
            <Badge variant="outline">
              {metadata.visitorPlatform || "Tidak tersedia"}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Viewport</p>
            <Badge variant="outline">{viewportSize}</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Dimulai</p>
            <p className="text-sm">
              {new Date(conversation.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pesan</p>
            <p className="text-sm">{conversation.messageCount ?? 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Aktif terakhir</p>
            <p className="text-sm">
              {new Date(
                conversation.lastMessageAt ?? conversation.createdAt
              ).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="flex h-125 flex-col">
        <CardHeader className="border-b py-3">
          <CardTitle className="border-0 text-base">Log Percakapan</CardTitle>
          <CardDescription className="text-xs">
            Detail percakapan pengunjung dengan bot
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-4">
          {messages.length === 0 ? (
            <div className="mt-10 text-center text-sm text-muted-foreground">
              Belum ada pesan di session ini.
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg._id}
                className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    msg.role === "assistant"
                      ? "border bg-white text-slate-800"
                      : "bg-slate-900 text-slate-50"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span className="mt-1 block text-[10px] opacity-50">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
