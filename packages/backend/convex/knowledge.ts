"use node";

import { ActionCtx, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";
import { Id } from "./_generated/dataModel";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

// We create an instance of GoogleGenAI using the built-in env var check of Convex Node environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const EMBEDDING_MODEL = "gemini-embedding-001";
const BATCH_SIZE = 4;
const DELAY_MS = 8000;
const MAX_CHUNK_CHARS = 4000;
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const TEXT_FILE_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".jsonl",
  ".log",
  ".html",
  ".htm",
  ".xml",
  ".yaml",
  ".yml",
  ".ini",
  ".conf",
  ".env",
  ".docx",
]);
const TEXT_MIME_PREFIXES = ["text/"];
const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/ld+json",
  "application/xml",
  "application/xhtml+xml",
  "application/x-yaml",
  "application/yaml",
  "application/csv",
  "application/javascript",
]);

/**
 * Split large strings into smaller chunks of maximum size to avoid exceeding embedding token limits.
 * Keep chunks paragraph-aware, but still split very long paragraphs defensively.
 */
function normalizePlainText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getFileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const extensionIndex = normalized.lastIndexOf(".");
  return extensionIndex >= 0 ? normalized.slice(extensionIndex) : "";
}

function stripMarkup(text: string) {
  return text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|section|article|li|tr|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function splitLongSegment(segment: string, maxChars: number): string[] {
  if (segment.length <= maxChars) {
    return [segment];
  }

  const sentenceParts = segment
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentenceParts.length > 1) {
    const nestedParts: string[] = [];
    let currentPart = "";

    for (const sentence of sentenceParts) {
      const nextValue = currentPart ? `${currentPart} ${sentence}` : sentence;
      if (nextValue.length <= maxChars) {
        currentPart = nextValue;
      } else {
        if (currentPart) {
          nestedParts.push(currentPart);
        }
        currentPart = sentence;
      }
    }

    if (currentPart) {
      nestedParts.push(currentPart);
    }

    return nestedParts.flatMap((part): string[] =>
      splitLongSegment(part, maxChars)
    );
  }

  const parts: string[] = [];
  for (let index = 0; index < segment.length; index += maxChars) {
    parts.push(segment.slice(index, index + maxChars));
  }

  return parts;
}

function chunkText(text: string, maxChars = MAX_CHUNK_CHARS): string[] {
  const paragraphs = normalizePlainText(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let currentChunk = "";

  const flushChunk = () => {
    const normalizedChunk = currentChunk.trim();
    if (normalizedChunk) {
      chunks.push(normalizedChunk);
    }
    currentChunk = "";
  };

  for (const paragraph of paragraphs) {
    for (const segment of splitLongSegment(paragraph, maxChars)) {
      if (!currentChunk) {
        currentChunk = segment;
        continue;
      }

      const candidate = `${currentChunk}\n\n${segment}`;
      if (candidate.length <= maxChars) {
        currentChunk = candidate;
      } else {
        flushChunk();
        currentChunk = segment;
      }
    }
  }

  flushChunk();

  return chunks;
}

type KnowledgeChunkInput = {
  chatbotId: Id<"chatbots">;
  url: string;
  title?: string;
  content: string;
  sourceType: "website" | "file";
  fileId?: Id<"knowledgeFiles">;
  sourceName?: string;
};

type StorageMetadataRecord = {
  _id: Id<"_storage">;
  contentType?: string;
  size: number;
  sha256: string;
};

type ProcessUploadedFileResponse = {
  success: boolean;
  fileId?: Id<"knowledgeFiles">;
  message: string;
  code?:
    | "FILE_NOT_FOUND"
    | "FILE_TOO_LARGE"
    | "FILE_NOT_READABLE"
    | "FILE_TYPE_UNSUPPORTED"
    | "FILE_TEXT_EMPTY"
    | "FILE_EMBEDDING_FAILED"
    | "FILE_PROCESSING_FAILED";
};

type SearchAndEmbedResponse = {
  success: true;
  message: string;
};

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedKnowledgeChunks(
  ctx: ActionCtx,
  chunks: KnowledgeChunkInput[]
) {
  let savedChunks = 0;

  for (let index = 0; index < chunks.length; index += BATCH_SIZE) {
    const batch = chunks.slice(index, index + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          const embedResult = await ai.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: item.content,
          });

          const vector = embedResult.embeddings?.[0]?.values;
          if (!vector) {
            return 0;
          }

          await ctx.runMutation(internal.knowledgeData.saveKnowledge, {
            chatbotId: item.chatbotId,
            url: item.url,
            title: item.title,
            content: item.content,
            sourceType: item.sourceType,
            fileId: item.fileId,
            sourceName: item.sourceName,
            embedding: vector,
          });

          return 1;
        } catch (error) {
          console.error("Failed to embed chunk", error);
          return 0;
        }
      })
    );

    savedChunks += batchResults.reduce<number>(
      (total, value) => total + value,
      0
    );

    if (index + BATCH_SIZE < chunks.length) {
      await delay(DELAY_MS);
    }
  }

  return savedChunks;
}

function buildPdfChunks(
  chatbotId: Id<"chatbots">,
  fileId: Id<"knowledgeFiles">,
  fileName: string,
  pages: string[]
) {
  const displaySource = `Upload file: ${fileName}`;
  const chunks: KnowledgeChunkInput[] = [];

  pages.forEach((pageText, pageIndex) => {
    const normalizedPage = normalizePlainText(pageText);
    if (!normalizedPage) {
      return;
    }

    const pagePrefix =
      pages.length > 1
        ? `Halaman ${pageIndex + 1}\n\n${normalizedPage}`
        : normalizedPage;

    for (const content of chunkText(pagePrefix)) {
      chunks.push({
        chatbotId,
        url: displaySource,
        title: fileName,
        content,
        sourceType: "file",
        fileId,
        sourceName: fileName,
      });
    }
  });

  return chunks;
}

function isPdfFile(fileName: string, contentType?: string) {
  const normalizedType = contentType?.toLowerCase().trim();

  if (normalizedType === "application/pdf") {
    return true;
  }

  return fileName.toLowerCase().endsWith(".pdf");
}

function isTextLikeFile(fileName: string, contentType?: string) {
  const extension = getFileExtension(fileName);
  if (TEXT_FILE_EXTENSIONS.has(extension)) {
    return true;
  }

  const normalizedType = contentType?.toLowerCase().trim();
  if (!normalizedType) {
    return false;
  }

  if (TEXT_MIME_TYPES.has(normalizedType)) {
    return true;
  }

  return TEXT_MIME_PREFIXES.some((prefix) => normalizedType.startsWith(prefix));
}

function isDocxFile(fileName: string, contentType?: string) {
  const normalizedType = contentType?.toLowerCase().trim();
  if (
    normalizedType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return true;
  }

  return fileName.toLowerCase().endsWith(".docx");
}

async function extractPdfText(blob: Blob) {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const result = await pdfParse(buffer);
  const text = normalizePlainText(result.text ?? "");

  return {
    text,
    pageCount: result.numpages && result.numpages > 0 ? result.numpages : 1,
    pages: text ? [text] : [],
  };
}

async function extractDocxText(blob: Blob) {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const result = await mammoth.extractRawText({ buffer });

  return {
    text: normalizePlainText(result.value ?? ""),
    pageCount: 1,
  };
}

async function extractFileText(
  blob: Blob,
  fileName: string,
  contentType?: string
): Promise<{ text: string; pageCount: number; pages?: string[] }> {
  if (isPdfFile(fileName, contentType)) {
    return extractPdfText(blob);
  }

  if (isDocxFile(fileName, contentType)) {
    return extractDocxText(blob);
  }

  if (!isTextLikeFile(fileName, contentType)) {
    throw new Error(
      "Tipe file belum didukung. Gunakan PDF, DOCX, TXT, MD, CSV, TSV, JSON, LOG, HTML, XML, YAML, atau ENV."
    );
  }

  let rawText = await blob.text();
  const extension = getFileExtension(fileName);
  if ([".html", ".htm", ".xml"].includes(extension)) {
    rawText = stripMarkup(rawText);
  }

  return {
    text: normalizePlainText(rawText),
    pageCount: 1,
  };
}

export const searchAndEmbed = action({
  args: {
    chatbotId: v.id("chatbots"),
    query: v.string(), // Search query or URL
  },
  handler: async (ctx, args): Promise<SearchAndEmbedResponse> => {
    await ctx.runQuery(internal.chatbots.getOwnedChatbot, {
      chatbotId: args.chatbotId,
    });

    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlApiKey) throw new Error("FIRECRAWL_API_KEY not configured");

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

    console.log(`Starting Firecrawl crawl for: ${args.query} with maxDepth: 1`);

    // Call Firecrawl Crawl v2 API Endpoint
    const res = await fetch("https://api.firecrawl.dev/v2/crawl", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: args.query,
        limit: 10,
        maxDiscoveryDepth: 1,
        sitemap: "skip",
        includePaths: [
          "/[^/]+", // Pola Regex/Glob: Ambil hanya 1 level setelah domain
        ],
        excludePaths: [
          "/[^/]+/.+", // Pola Regex/Glob: Buang kalau ada sub-folder lagi
        ],
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: false,
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Firecrawl Crawl API error: ${res.status} ${errorText}`);
    }

    const initData = await res.json();
    if (!initData.success || !initData.id) {
      throw new Error(
        `Firecrawl crawl init failed: ${JSON.stringify(initData)}`
      );
    }

    const crawlJobId = initData.id;
    let crawlStatus = "scraping";
    let crawlData: any = null;
    let retries = 0;

    // Polling until status is completed (Convex Action allows up to 2-5 minutes limit)
    while (
      crawlStatus !== "completed" &&
      crawlStatus !== "failed" &&
      retries < 45
    ) {
      await new Promise((r) => setTimeout(r, 4000)); // wait 4 seconds
      const statusRes = await fetch(
        `https://api.firecrawl.dev/v2/crawl/${crawlJobId}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${firecrawlApiKey}` },
        }
      );
      crawlData = await statusRes.json();
      crawlStatus = crawlData.status;
      retries++;
    }

    if (crawlStatus !== "completed") {
      throw new Error(
        `Crawl failed atau memakan waktu terlalu lama. Status terakhir: ${crawlStatus}. Coba kurangi kompleksitas URL.`
      );
    }

    // Process the results
    const results = crawlData.data || [];

    // 1. Kumpulkan semua chunks dari semua halaman ke dalam satu array flat
    const allChunks: KnowledgeChunkInput[] = [];

    for (const result of results) {
      const markdownContent = result.markdown || "";
      if (!markdownContent.trim()) continue;

      const chunks = chunkText(markdownContent);
      for (const chunk of chunks) {
        allChunks.push({
          chatbotId: args.chatbotId,
          url: result.metadata?.sourceURL || result.metadata?.url || args.query,
          title: result.metadata?.title || "",
          content: chunk,
          sourceType: "website",
          sourceName: result.metadata?.title || result.metadata?.sourceURL,
        });
      }
    }

    const savedChunks = await embedKnowledgeChunks(ctx, allChunks);

    return {
      success: true,
      message: `Berhasil scrap dan ekstrak ${results.length} URL. Dipecah menjadi ${savedChunks} bagian knowledge.`,
    };
  },
});

export const processUploadedFile = action({
  args: {
    chatbotId: v.id("chatbots"),
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args): Promise<ProcessUploadedFileResponse> => {
    await ctx.runQuery(internal.chatbots.getOwnedChatbot, {
      chatbotId: args.chatbotId,
    });

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

    const metadata: StorageMetadataRecord | null = await ctx.runQuery(
      internal.knowledgeFiles.getStorageMetadata,
      {
        storageId: args.storageId,
      }
    );

    if (!metadata) {
      return {
        success: false,
        code: "FILE_NOT_FOUND",
        message: "File upload tidak ditemukan. Silakan upload ulang file Anda.",
      };
    }

    if (metadata.size > MAX_FILE_SIZE_BYTES) {
      try {
        await ctx.storage.delete(args.storageId);
      } catch (error) {
        console.warn("Failed to delete oversized upload", error);
      }

      return {
        success: false,
        code: "FILE_TOO_LARGE",
        message: "Ukuran file melebihi batas 15 MB.",
      };
    }

    const fileId: Id<"knowledgeFiles"> = await ctx.runMutation(
      internal.knowledgeFiles.createKnowledgeFile,
      {
        chatbotId: args.chatbotId,
        storageId: args.storageId,
        fileName: args.fileName,
        contentType: metadata.contentType,
        sizeBytes: metadata.size,
      }
    );

    try {
      const blob = await ctx.storage.get(args.storageId);
      if (!blob) {
        throw new Error("File tidak dapat dibaca dari storage.");
      }

      const extracted = await extractFileText(
        blob,
        args.fileName,
        metadata.contentType
      );
      const chunks = buildPdfChunks(
        args.chatbotId,
        fileId,
        args.fileName,
        extracted.pages && extracted.pages.length > 0
          ? extracted.pages
          : [extracted.text]
      );

      if (chunks.length === 0) {
        throw new Error(
          "Teks tidak dapat diekstrak dari file. Pastikan dokumen berisi teks yang dapat dibaca."
        );
      }

      const savedChunks = await embedKnowledgeChunks(ctx, chunks);
      if (savedChunks === 0) {
        throw new Error("Tidak ada chunk file yang berhasil diproses.");
      }

      const previewText = normalizePlainText(extracted.text).slice(0, 280);

      await ctx.runMutation(internal.knowledgeFiles.markKnowledgeFileReady, {
        fileId,
        pageCount: extracted.pageCount,
        chunkCount: savedChunks,
        previewText: previewText || undefined,
      });

      const partialSuffix =
        savedChunks < chunks.length
          ? ` ${chunks.length - savedChunks} chunk gagal diproses, namun file tetap tersedia untuk RAG.`
          : "";

      return {
        success: true,
        fileId,
        message: `File ${args.fileName} berhasil diproses menjadi ${savedChunks} chunk knowledge.${partialSuffix}`,
      };
    } catch (error) {
      await ctx.runMutation(internal.knowledgeData.removeKnowledgeByFileId, {
        fileId,
      });

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memproses file.";

      await ctx.runMutation(internal.knowledgeFiles.markKnowledgeFileFailed, {
        fileId,
        errorMessage,
      });

      return {
        success: false,
        code:
          errorMessage === "File tidak dapat dibaca dari storage."
            ? "FILE_NOT_READABLE"
            : errorMessage.includes("Tipe file belum didukung")
              ? "FILE_TYPE_UNSUPPORTED"
              : errorMessage.includes("Teks tidak dapat diekstrak")
                ? "FILE_TEXT_EMPTY"
                : errorMessage.includes(
                      "Tidak ada chunk file yang berhasil diproses"
                    )
                  ? "FILE_EMBEDDING_FAILED"
                  : "FILE_PROCESSING_FAILED",
        message: errorMessage,
      };
    }
  },
});

export const editKnowledge = action({
  args: {
    knowledgeId: v.id("knowledge"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

    const embedResult = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: args.content,
    });

    const vector = embedResult.embeddings?.[0]?.values;
    if (!vector) throw new Error("Gagal generate embedding baru");

    await ctx.runMutation(internal.knowledgeData.updateKnowledgeData, {
      knowledgeId: args.knowledgeId,
      content: args.content,
      embedding: vector,
    });

    return { success: true };
  },
});
