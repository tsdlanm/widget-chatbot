"use client";

import React, { useState } from "react";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Loader2,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  FileText,
} from "lucide-react";

export default function KnowledgePage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const { id } = React.use(params as Promise<{ id: string }>);
  const chatbotId = id as Id<"chatbots">;

  const [url, setUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [editingId, setEditingId] = React.useState<Id<"knowledge"> | null>(
    null
  );
  const [deletingId, setDeletingId] = React.useState<Id<"knowledge"> | null>(
    null
  );
  const [editContent, setEditContent] = React.useState("");
  const [isSaving, setIsSaving] = useState(false);

  const scrapeAction = useAction(api.knowledge.searchAndEmbed);
  const knowledgeList = useQuery(api.knowledgeData.getKnowledge, { chatbotId });
  const removeKnowledge = useMutation(api.knowledgeData.removeKnowledge);
  const editKnowledge = useAction(api.knowledge.editKnowledge);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsScraping(true);
    setStatusMessage("Memulai crawling via Firecrawl dan embedding Gemini...");

    try {
      const result = await scrapeAction({
        chatbotId,
        query: url,
      });

      if (result.success) {
        setStatusMessage(result.message);
        setUrl("");
      } else {
        setStatusMessage("Gagal memproses data.");
      }
    } catch (error: any) {
      setStatusMessage(
        "Terjadi kesalahan sistem saat memproses laman tersebut."
      );
    } finally {
      setIsScraping(false);
    }
  };

  const handleStartEdit = (kb: any) => {
    setEditingId(kb._id);
    setEditContent(kb.content);
  };

  const handleSaveEdit = async (kbId: Id<"knowledge">) => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    try {
      await editKnowledge({
        knowledgeId: kbId,
        content: editContent,
      });
      setEditingId(null);
    } catch (e: any) {
      alert("Gagal menyimpan hasil editan. Terjadi kendala sistem.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Knowledge Base RAG</h3>
        <p className="text-sm text-muted-foreground">
          Tambahkan referensi website agar chatbot dapat belajar dan merespon
          berdasarkan konteks custom Anda.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Sumber Pengetahuan</CardTitle>
          <CardDescription>
            Masukkan URL website untuk dicrawl 1-level kedalaman (Max 10 link)
            menggunakan Firecrawl.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScrape} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL Topik atau Website</Label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="url"
                    placeholder="https://example.com/docs"
                    className="pl-9"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isScraping}
                  />
                </div>
                <Button type="submit" disabled={isScraping || !url}>
                  {isScraping ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Scrape Link"
                  )}
                </Button>
              </div>
            </div>

            {statusMessage && (
              <div
                className={`rounded-md p-3 text-sm ${statusMessage.includes("Gagal") || statusMessage.includes("kesalahan") || statusMessage.includes("terlalu lama") ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
              >
                {statusMessage}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h4 className="text-lg font-medium tracking-tight">
          Dokumen Tersimpan
        </h4>
        {knowledgeList === undefined ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : knowledgeList.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">
                Belum ada dokumen
              </p>
              <p className="text-sm text-muted-foreground">
                Scrape website untuk mulai menambah knowledge bot ini.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {knowledgeList.map((kb) => (
              <Card
                key={kb._id}
                className="flex flex-col transition-colors hover:bg-muted/50"
              >
                <CardHeader className="pb-3 text-sm">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="wrap-break-word text-sm leading-snug">
                        {kb.title || "Potongan Dokumen"}
                      </CardTitle>
                      <CardDescription className="truncate" title={kb.url}>
                        {kb.url}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 sm:justify-end sm:pl-2">
                      {editingId === kb._id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/30"
                            onClick={() => handleSaveEdit(kb._id)}
                            disabled={isSaving}
                            title="Simpan"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground"
                            onClick={() => setEditingId(null)}
                            disabled={isSaving}
                            title="Batal"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : deletingId === kb._id ? (
                        <div className="flex animate-in items-center gap-1 zoom-in-95 fade-in">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 shrink-0 px-3"
                            onClick={() => {
                              removeKnowledge({ knowledgeId: kb._id });
                              setDeletingId(null);
                            }}
                          >
                            Yakin
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 shrink-0 px-3"
                            onClick={() => setDeletingId(null)}
                          >
                            Batal
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground"
                            onClick={() => handleStartEdit(kb)}
                            title="Edit Dokumen"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeletingId(kb._id)}
                            title="Hapus Dokumen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  {editingId === kb._id ? (
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-37.5 resize-none"
                      disabled={isSaving}
                    />
                  ) : (
                    <div
                      className="line-clamp-6 rounded-md bg-muted/30 p-3 text-sm text-foreground/80"
                      title={kb.content}
                    >
                      {kb.content}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
