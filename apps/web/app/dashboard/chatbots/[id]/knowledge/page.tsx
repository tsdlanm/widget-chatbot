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
  Upload,
} from "lucide-react";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@workspace/ui/components/file-upload";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_FILE_TYPES =
  ".pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.jsonl,.log,.html,.htm,.xml,.yaml,.yml,.ini,.conf,.env,text/plain,text/markdown,text/csv,application/json,application/xml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function getUploadErrorMessage(code?: string) {
  switch (code) {
    case "FILE_NOT_FOUND":
      return "File upload tidak ditemukan. Silakan pilih file lalu upload ulang.";
    case "FILE_TOO_LARGE":
      return "Ukuran file melebihi batas 15 MB.";
    case "FILE_NOT_READABLE":
      return "File tidak dapat dibaca dari storage. Silakan coba upload ulang.";
    case "FILE_TYPE_UNSUPPORTED":
      return "Format file belum didukung. Gunakan PDF, DOCX, TXT, Markdown, CSV, TSV, JSON, LOG, HTML, XML, YAML, INI, CONF, atau ENV.";
    case "FILE_TEXT_EMPTY":
      return "Teks tidak berhasil diekstrak dari file. Pastikan dokumen berisi teks yang bisa dibaca, bukan hanya gambar.";
    case "FILE_EMBEDDING_FAILED":
      return "Isi file terbaca, tetapi chunk knowledge gagal diproses. Silakan coba lagi.";
    case "FILE_PROCESSING_FAILED":
      return "Terjadi kendala saat memproses file. Silakan coba beberapa saat lagi.";
    default:
      return "Terjadi gangguan sistem saat upload file. Silakan coba lagi.";
  }
}

export default function KnowledgePage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const { id } = React.use(params as Promise<{ id: string }>);
  const chatbotId = id as Id<"chatbots">;

  const [activeTab, setActiveTab] = useState<"website" | "file">("website");
  const [url, setUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileStatusMessage, setFileStatusMessage] = React.useState("");
  const [fileStatusVariant, setFileStatusVariant] = React.useState<
    "default" | "destructive"
  >("default");
  const [isUploading, setIsUploading] = React.useState(false);

  const [editingId, setEditingId] = React.useState<Id<"knowledge"> | null>(
    null
  );
  const [deletingId, setDeletingId] = React.useState<Id<"knowledge"> | null>(
    null
  );
  const [editContent, setEditContent] = React.useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const scrapeAction = useAction(api.knowledge.searchAndEmbed);
  const websiteKnowledgeList = useQuery(api.knowledgeData.getKnowledge, {
    chatbotId,
    sourceType: "website",
  });
  const fileKnowledgeList = useQuery(api.knowledgeData.getKnowledge, {
    chatbotId,
    sourceType: "file",
  });
  const removeKnowledge = useMutation(api.knowledgeData.removeKnowledge);
  const removeAllBySourceType = useMutation(
    api.knowledgeData.removeAllBySourceType
  );
  const editKnowledge = useAction(api.knowledge.editKnowledge);
  const generateUploadUrl = useMutation(api.knowledgeFiles.generateUploadUrl);
  const processUploadedFile = useAction(api.knowledge.processUploadedFile);

  const activeKnowledgeList =
    activeTab === "website" ? websiteKnowledgeList : fileKnowledgeList;
  const safeKnowledgeList = activeKnowledgeList ?? [];

  React.useEffect(() => {
    setEditingId(null);
    setDeletingId(null);
    setEditContent("");
    setDeletingAll(false);
  }, [activeTab]);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsScraping(true);
    setStatusMessage("Memulai crawling....");

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

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedFile) {
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setFileStatusVariant("destructive");
      setFileStatusMessage("Ukuran file melebihi batas 15 MB.");
      return;
    }

    setIsUploading(true);
    setFileStatusVariant("default");
    setFileStatusMessage(
      "Mengunggah file ke storage dan menyiapkan pipeline RAG..."
    );

    try {
      const uploadUrl = await generateUploadUrl({});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": selectedFile.type || "application/pdf",
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Gagal mengunggah file ke storage.");
      }

      const { storageId } = (await uploadResponse.json()) as {
        storageId?: Id<"_storage">;
      };

      if (!storageId) {
        throw new Error("Storage ID tidak diterima setelah upload.");
      }

      const result = await processUploadedFile({
        chatbotId,
        storageId,
        fileName: selectedFile.name,
      });

      if (!result.success) {
        setFileStatusVariant("destructive");
        setFileStatusMessage(getUploadErrorMessage(result.code));
        return;
      }

      setFileStatusVariant("default");
      setFileStatusMessage(result.message);
      setSelectedFile(null);
    } catch {
      setFileStatusVariant("destructive");
      setFileStatusMessage(getUploadErrorMessage());
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Knowledge Base RAG</h3>
        <p className="text-sm text-muted-foreground">
          Kelola knowledge dari berbagai sumber secara terpusat. Unggah dokumen
          atau masukkan URL website untuk memperkaya basis data AI
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border bg-muted/30 p-1">
          <Button
            type="button"
            variant={activeTab === "website" ? "default" : "ghost"}
            className="rounded-full px-4"
            onClick={() => setActiveTab("website")}
          >
            Website
          </Button>
          <Button
            type="button"
            variant={activeTab === "file" ? "default" : "ghost"}
            className="rounded-full px-4"
            onClick={() => setActiveTab("file")}
          >
            File
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          Pilih sumber knowledge yang ingin dikelola.
        </span>
      </div>

      {activeTab === "website" ? (
        <Card>
          <CardHeader>
            <CardTitle>Tambah Sumber Website</CardTitle>
            <CardDescription>
              Masukkan URL untuk mengambil konten dari halaman utama dan tautan
              langsung di dalamnya (Maks. 10 link) via firecrawl.
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                <span className="font-semibold text-slate-700">Contoh:</span>{" "}
                Jika input
                <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-slate-800">
                  domain.com/layanan
                </code>
                , sistem hanya mengambil tautan di halaman tersebut, bukan
                <code className="mx-1 text-red-500 line-through opacity-70">
                  domain.com/layanan/detail
                </code>
                .
              </p>
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Upload Dokumen</CardTitle>
            <CardDescription>
              Maks 15 MB. File PDF, DOCX, dan teks akan diekstrak otomatis
              menjadi potongan data (chunks) untuk basis pengetahuan AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="knowledge-file">Dokumen Sumber</Label>
                <FileUpload
                  accept={ACCEPTED_FILE_TYPES}
                  maxFiles={1}
                  maxSize={MAX_FILE_SIZE_BYTES}
                  disabled={isUploading}
                  value={selectedFile ? [selectedFile] : []}
                  onValueChange={(files) => {
                    setSelectedFile(files[0] ?? null);
                    if (files.length === 0) {
                      setFileStatusMessage("");
                      setFileStatusVariant("default");
                    }
                  }}
                  onFileReject={(_, message) => {
                    setFileStatusVariant("destructive");
                    if (message === "File too large") {
                      setFileStatusMessage("Ukuran file melebihi batas 15 MB.");
                    } else if (message === "File type not accepted") {
                      setFileStatusMessage(
                        "Format file belum didukung. Gunakan PDF, DOCX, TXT, Markdown, CSV, TSV, JSON, LOG, HTML, XML, YAML, INI, CONF, atau ENV."
                      );
                    } else {
                      setFileStatusMessage(message);
                    }
                  }}
                >
                  <FileUploadDropzone
                    id="knowledge-file"
                    className={`min-h-36 items-stretch rounded-2xl border-dashed p-5 ${isUploading ? "cursor-not-allowed opacity-70" : "hover:border-primary/50 hover:bg-muted/30"}`}
                  >
                    <div className="flex h-full flex-col justify-center gap-3 text-center">
                      <div className="mx-auto flex size-11 items-center justify-center rounded-full border bg-background">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          Seret file ke sini atau pilih manual
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, DOCX, TXT, Markdown, CSV, JSON, LOG, HTML, XML,
                          YAML.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <FileUploadTrigger asChild>
                          <Button type="button" variant="outline" size="sm">
                            Pilih File
                          </Button>
                        </FileUploadTrigger>
                        <span className="text-xs text-muted-foreground">
                          Maks 15 MB
                        </span>
                      </div>
                    </div>
                  </FileUploadDropzone>

                  <FileUploadList>
                    {selectedFile ? (
                      <FileUploadItem
                        value={selectedFile}
                        className="rounded-2xl border bg-muted/20"
                      >
                        <FileUploadItemPreview />
                        <FileUploadItemMetadata />
                        <FileUploadItemDelete asChild>
                          <Button type="button" variant="ghost" size="icon">
                            <X className="h-4 w-4" />
                          </Button>
                        </FileUploadItemDelete>
                      </FileUploadItem>
                    ) : null}
                  </FileUploadList>
                </FileUpload>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={isUploading || !selectedFile}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload File
                    </>
                  )}
                </Button>
                {selectedFile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isUploading}
                    onClick={() => {
                      setSelectedFile(null);
                    }}
                  >
                    Pilih Ulang
                  </Button>
                ) : null}
              </div>

              {fileStatusMessage ? (
                <div
                  className={`rounded-md p-3 text-sm ${fileStatusVariant === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
                >
                  {fileStatusMessage}
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-medium tracking-tight">
            {activeTab === "website" ? "Chunk Website" : "Chunk File"}
          </h4>
          {safeKnowledgeList.length > 0 && (
            <>
              {deletingAll ? (
                <div className="flex animate-in gap-1 fade-in slide-in-from-right-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      removeAllBySourceType({
                        chatbotId,
                        sourceType: activeTab,
                      });
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
        {activeTab === "website" && websiteKnowledgeList === undefined ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === "file" && fileKnowledgeList === undefined ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : safeKnowledgeList.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">
                Belum ada dokumen
              </p>
              <p className="text-sm text-muted-foreground">
                {activeTab === "website"
                  ? "Scrape website untuk mulai menambah knowledge source berbasis web."
                  : "Upload file untuk mulai menambah knowledge source berbasis file."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {safeKnowledgeList.map((kb) => (
              <Card
                key={kb._id}
                className="flex flex-col transition-colors hover:bg-muted/50"
              >
                <CardHeader className="pb-3 text-sm">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm leading-snug wrap-break-word">
                        {activeTab === "file"
                          ? kb.sourceName || kb.title || "Potongan Dokumen"
                          : kb.title || "Potongan Dokumen"}
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
