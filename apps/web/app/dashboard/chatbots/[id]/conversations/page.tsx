"use client";

import * as React from "react";
import Link from "next/link";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";

import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default function ConversationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const chatbotId = id as Id<"chatbots">;
  const { isLoading, isAuthenticated } = useConvexAuth();
  const conversations = useQuery(
    api.conversations.listByBot,
    isLoading || !isAuthenticated ? "skip" : { chatbotId }
  );
  const deleteConversation = useMutation(api.conversations.deleteConversation);
  const deleteAll = useMutation(api.conversations.deleteAllByBot);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deletingAll, setDeletingAll] = React.useState(false);

  if (isLoading) {
    return <div className="text-muted-foreground">Memuat autentikasi...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="text-muted-foreground">Anda belum terautentikasi.</div>
    );
  }

  if (conversations === undefined) {
    return <div className="text-muted-foreground">Memuat conversations...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">History Percakapan</h3>
          <p className="text-sm text-muted-foreground">
            Pilih session untuk melihat detail percakapan.
          </p>
        </div>
        {conversations.length > 0 && (
          <>
            {deletingAll ? (
              <div className="flex animate-in gap-1 fade-in slide-in-from-right-4">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    deleteAll({ chatbotId });
                    setDeletingAll(false);
                  }}
                >
                  Yakin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingAll(false)}
                >
                  Batal
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeletingAll(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus Semua
              </Button>
            )}
          </>
        )}
      </div>

      {conversations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada percakapan untuk chatbot ini.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {conversations.map((conv) => (
            <Card key={conv._id} className="transition hover:border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="truncate text-base">
                  {conv.metadata.visitorName?.trim()
                    ? conv.metadata.visitorName
                    : `Session ${conv.sessionId.substring(0, 8)}`}
                </CardTitle>
                <CardDescription className="space-y-1">
                  <div>{new Date(conv.createdAt).toLocaleString()}</div>
                  <div className="truncate text-xs">
                    {conv.metadata.visitorUrl || "URL tidak tersedia"}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    {conv.messageCount ?? 0} pesan
                  </Badge>
                  {conv.metadata.visitorLanguage && (
                    <Badge variant="secondary" className="text-xs">
                      {conv.metadata.visitorLanguage}
                    </Badge>
                  )}
                  {conv.metadata.visitorPlatform && (
                    <Badge variant="secondary" className="text-xs">
                      {conv.metadata.visitorPlatform}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {conv.lastMessageAt
                    ? `Aktif terakhir ${new Date(conv.lastMessageAt).toLocaleString()}`
                    : "Belum ada aktivitas pesan."}
                </p>
              </CardContent>
              <div className="flex gap-2 px-6 pb-6">
                <Button asChild variant="secondary" className="flex-1">
                  <Link
                    href={`/dashboard/chatbots/${id}/conversations/${conv._id}`}
                  >
                    Buka Session
                  </Link>
                </Button>
                {deletingId === conv._id ? (
                  <div className="flex animate-in gap-1 fade-in slide-in-from-right-4">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        deleteConversation({ conversationId: conv._id });
                        setDeletingId(null);
                      }}
                    >
                      Yakin
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setDeletingId(null)}
                    >
                      Batal
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setDeletingId(conv._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
