"use client";

import * as React from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  Check,
  Edit2,
  FileText,
  FileUp,
  Loader2,
  Trash2,
  X,
  Upload,
} from "lucide-react";

import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_FILE_TYPES =
  ".pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.jsonl,.log,.html,.htm,.xml,.yaml,.yml,.ini,.conf,.env,text/plain,text/markdown,text/csv,application/json,application/xml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function getFileKindLabel(fileName: string, contentType?: string | null) {
  const normalizedType = contentType?.toLowerCase() ?? "";
  const normalizedName = fileName.toLowerCase();

  if (normalizedType === "application/pdf" || normalizedName.endsWith(".pdf")) {
    return "PDF";
  }
  if (normalizedName.endsWith(".md") || normalizedName.endsWith(".markdown")) {
    return "Markdown";
  }
  if (normalizedName.endsWith(".csv")) {
    return "CSV";
  }
  if (normalizedName.endsWith(".docx")) {
    return "DOCX";
  }
  if (normalizedName.endsWith(".tsv")) {
    return "TSV";
  }
  if (normalizedName.endsWith(".json") || normalizedName.endsWith(".jsonl")) {
    return "JSON";
  }
  if (
    normalizedName.endsWith(".html") ||
    normalizedName.endsWith(".htm") ||
    normalizedName.endsWith(".xml")
  ) {
    return "Markup";
  }
  return "Text";
}

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

export default function UploadFilePage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const { id } = React.use(params as Promise<{ id: string }>);
  const chatbotId = id as Id<"chatbots">;

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [statusMessage, setStatusMessage] = React.useState("");
  const [statusVariant, setStatusVariant] = React.useState<
    "default" | "destructive"
  >("default");
  const [isUploading, setIsUploading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<Id<"knowledge"> | null>(
    null
  );
  const [editingId, setEditingId] = React.useState<Id<"knowledge"> | null>(
    null
  );
  const [editContent, setEditContent] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const generateUploadUrl = useMutation(api.knowledgeFiles.generateUploadUrl);
  const processUploadedFile = useAction(api.knowledge.processUploadedFile);
  const removeKnowledge = useMutation(api.knowledgeData.removeKnowledge);
  const editKnowledge = useAction(api.knowledge.editKnowledge);
  const knowledgeList = useQuery(api.knowledgeData.getKnowledge, {
    chatbotId,
    sourceType: "file",
  });

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedFile) {
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setStatusVariant("destructive");
      setStatusMessage("Ukuran file melebihi batas 15 MB.");
      return;
    }

    setIsUploading(true);
    setStatusVariant("default");
    setStatusMessage(
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
        setStatusVariant("destructive");
        setStatusMessage(getUploadErrorMessage(result.code));
        return;
      }

      setStatusVariant("default");
      setStatusMessage(result.message);
      setSelectedFile(null);
    } catch {
      setStatusVariant("destructive");
      setStatusMessage(getUploadErrorMessage());
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartEdit = (kb: { _id: Id<"knowledge">; content: string }) => {
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
    } catch {
      alert("Gagal menyimpan hasil editan. Terjadi kendala sistem.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Upload File RAG</h3>
        <p className="text-sm text-muted-foreground">
          Unggah PDF atau file teks sederhana agar chatbot dapat menggunakan isi
          dokumen sebagai sumber knowledge tambahan di pipeline RAG yang sama.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah File Pengetahuan</CardTitle>
          <CardDescription>
            Upload file hingga 15 MB. PDF dan DOCX akan diekstrak langsung di
            backend, sedangkan file teks seperti TXT, MD, CSV, JSON, LOG, HTML,
            XML, YAML, dan ENV dibaca langsung tanpa konfigurasi tambahan.
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
                    setStatusMessage("");
                    setStatusVariant("default");
                  }
                }}
                onFileReject={(_, message) => {
                  setStatusVariant("destructive");
                  if (message === "File too large") {
                    setStatusMessage("Ukuran file melebihi batas 15 MB.");
                  } else if (message === "File type not accepted") {
                    setStatusMessage(
                      "Format file belum didukung. Gunakan PDF, DOCX, TXT, Markdown, CSV, TSV, JSON, LOG, HTML, XML, YAML, INI, CONF, atau ENV."
                    );
                  } else {
                    setStatusMessage(message);
                  }
                }}
              >
                <FileUploadDropzone
                  id="knowledge-file"
                  className={`min-h-44 items-stretch rounded-2xl border-dashed p-5 ${isUploading ? "cursor-not-allowed opacity-70" : "hover:border-primary/50 hover:bg-muted/30"}`}
                >
                  <div className="flex h-full flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-base font-medium">
                          <FileUp className="h-5 w-5" />
                          Pilih atau drop file di sini
                        </div>
                        <p className="max-w-2xl text-sm text-muted-foreground">
                          Didukung: PDF, DOCX, TXT, Markdown, CSV, TSV, JSON,
                          LOG, HTML, XML, YAML, INI, CONF, dan ENV.
                        </p>
                      </div>
                      <div className="hidden rounded-full border px-3 py-1 text-xs text-muted-foreground sm:block">
                        Maks 15 MB
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                      <div className="rounded-xl bg-muted/50 p-3">
                        PDF dan DOCX diekstrak lokal di backend tanpa model
                        generatif.
                      </div>
                      <div className="rounded-xl bg-muted/50 p-3">
                        File teks diproses langsung tanpa library tambahan.
                      </div>
                      <div className="rounded-xl bg-muted/50 p-3">
                        Seluruh source masuk ke vector knowledge yang sama.
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <FileUploadTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          Pilih File
                        </Button>
                      </FileUploadTrigger>
                      <span className="text-xs text-muted-foreground">
                        Atau drop file ke area ini
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
                    <FileUp className="mr-2 h-4 w-4" />
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

            {statusMessage ? (
              <Alert
                variant={
                  statusVariant === "destructive" ? "destructive" : "default"
                }
              >
                {statusVariant === "destructive" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <AlertTitle>
                  {statusVariant === "destructive"
                    ? "Proses upload gagal"
                    : "Status upload"}
                </AlertTitle>
                <AlertDescription>{statusMessage}</AlertDescription>
              </Alert>
            ) : null}
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
                Upload file untuk mulai menambah knowledge source berbasis file.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {knowledgeList.map((kb) => {
              const isDeleting = deletingId === kb._id;
              const isEditing = editingId === kb._id;
              const title = kb.sourceName || kb.title || "Potongan Dokumen";
              const subtitle = kb.sourceName || kb.url || "Upload file";
              return (
                <Card
                  key={kb._id}
                  className="flex flex-col transition-colors hover:bg-muted/50"
                >
                  <CardHeader className="pb-3 text-sm">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm leading-snug wrap-break-word">
                          {title}
                        </CardTitle>
                        <CardDescription className="truncate" title={subtitle}>
                          {subtitle}
                        </CardDescription>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">
                            {getFileKindLabel(title, null)}
                          </Badge>
                          <Badge variant="secondary">File</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 sm:justify-end sm:pl-2">
                        {isEditing ? (
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
                        ) : isDeleting ? (
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
                    {isEditing ? (
                      <Textarea
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
