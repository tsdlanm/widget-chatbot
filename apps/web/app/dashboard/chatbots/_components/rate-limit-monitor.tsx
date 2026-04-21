"use client";

import { useEffect, useState } from "react";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { AlertTriangle, Clock3, Gauge, Layers3, Trash2 } from "lucide-react";

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

const MAX_MESSAGES = 50;
const WINDOW_MINUTES = 60;

function formatReset(msUntilReset: number) {
  if (msUntilReset <= 0) return "reset segera";

  const minutes = Math.ceil(msUntilReset / 60000);
  if (minutes < 60) {
    return `reset dalam ${minutes} menit`;
  }

  const hours = Math.ceil(minutes / 60);
  return `reset dalam ${hours} jam`;
}

export function RateLimitMonitor({ chatbotId }: { chatbotId: Id<"chatbots"> }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const payload = useQuery(
    api.rateLimit.listByChatbot,
    isLoading || !isAuthenticated ? "skip" : { chatbotId }
  );
  const deleteOne = useMutation(api.rateLimit.deleteOne);
  const deleteAll = useMutation(api.rateLimit.deleteAllByChatbot);

  const [now, setNow] = useState(() => Date.now());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Memuat autentikasi...</div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-sm text-muted-foreground">
        Anda belum terautentikasi.
      </div>
    );
  }

  if (payload === undefined) {
    return (
      <div className="text-sm text-muted-foreground">
        Memuat data rate limit...
      </div>
    );
  }

  const { entries, summary } = payload;
  const liveEntries = entries.map((entry) => ({
    ...entry,
    msUntilReset: Math.max(entry.windowExpiresAt - now, 0),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Gauge className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.totalSessions}</div>
              <p className="text-xs text-muted-foreground">Session terpantau</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
              <Layers3 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.activeSessions}</div>
              <p className="text-xs text-muted-foreground">Window aktif</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-orange-500/10 p-2 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {summary.limitedSessions}
              </div>
              <p className="text-xs text-muted-foreground">Sedang terbatasi</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-slate-500/10 p-2 text-slate-600">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.totalMessages}</div>
              <p className="text-xs text-muted-foreground">Pesan tercatat</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Detail Rate Limit</CardTitle>
              <CardDescription>
                Batas saat ini adalah {MAX_MESSAGES} pesan per {WINDOW_MINUTES}{" "}
                menit untuk tiap session.
              </CardDescription>
            </div>
            {liveEntries.length > 0 && (
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
        </CardHeader>
        <CardContent className="space-y-4">
          {liveEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
              Belum ada session yang terkena monitoring rate limit. Data akan
              muncul setelah widget menerima pesan.
            </div>
          ) : (
            liveEntries.map((entry) => {
              const progress = Math.min(
                (entry.messagesUsed / MAX_MESSAGES) * 100,
                100
              );

              return (
                <div
                  key={`${entry.chatbotId}-${entry.sessionId}`}
                  className="rounded-xl border p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-medium">
                          {entry.visitorName}
                        </p>
                        <Badge
                          variant={
                            entry.status === "limited"
                              ? "destructive"
                              : entry.status === "active"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {entry.status === "limited"
                            ? "Limited"
                            : entry.status === "active"
                              ? "Active"
                              : "Expired"}
                        </Badge>
                        <p>{entry.sessionId}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Window dimulai{" "}
                        {new Date(entry.windowStart).toLocaleString()} ·{" "}
                        {formatReset(entry.msUntilReset)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm">
                        <div className="font-medium">
                          {entry.messagesUsed}/{MAX_MESSAGES} pesan
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Sisa {entry.remainingMessages} pesan
                        </div>
                      </div>
                      {deletingId === entry._id ? (
                        <div className="flex animate-in gap-1 fade-in slide-in-from-right-4">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              deleteOne({
                                rateLimitId: entry._id as Id<"rateLimits">,
                              });
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
                          onClick={() => setDeletingId(entry._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${entry.status === "limited" ? "bg-orange-500" : entry.status === "expired" ? "bg-slate-300" : "bg-primary"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Window 1 jam</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
