"use node";

import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";

// We create an instance of GoogleGenAI using the built-in env var check of Convex Node environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Split large strings into smaller chunks of maximum size to avoid exceeding embedding token limits.
 * Here we simply chunk by paragraph or a set length.
 */
function chunkText(text: string, maxTokens = 1000): string[] {
  const paragraphs = text.split("\n\n");
  const chunks = [];
  let currentChunk = "";

  for (const p of paragraphs) {
    if (currentChunk.length + p.length < maxTokens * 4) {
      // Rough estimation: 1 token = 4 chars
      currentChunk += (currentChunk ? "\n\n" : "") + p;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = p;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  return chunks;
}

export const searchAndEmbed = action({
  args: {
    chatbotId: v.id("chatbots"),
    query: v.string(), // Search query or URL
  },
  handler: async (ctx, args) => {
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
    let savedChunks = 0;

    // 1. Kumpulkan semua chunks dari semua halaman ke dalam satu array flat
    const allChunks: { url: string; title: string; content: string }[] = [];
    
    for (const result of results) {
      const markdownContent = result.markdown || "";
      if (!markdownContent.trim()) continue;

      const chunks = chunkText(markdownContent);
      for (const chunk of chunks) {
        allChunks.push({
          url: result.metadata?.sourceURL || result.metadata?.url || args.query,
          title: result.metadata?.title || "",
          content: chunk,
        });
      }
    }

    // 2. Sistem Batching + Delay
    // Gemini Free Tier limit: ~30.000 TPM. 
    // Kita set max 4 chunk per batch (sekitar ~4000 token) dan di-delay 8 detik.
    // Kecepatan ini menjaga agar TPM yang dikirim maksimal ~30.000 per menit (60s / 8s * 4000).
    const BATCH_SIZE = 4;
    const DELAY_MS = 8000;

    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (item) => {
        try {
          const embedResult = await ai.models.embedContent({
            model: "gemini-embedding-001",
            contents: item.content,
          });

          if (
            embedResult &&
            embedResult.embeddings &&
            embedResult.embeddings.length > 0
          ) {
            const vector = embedResult.embeddings[0].values;
            if (vector) {
              await ctx.runMutation(internal.knowledgeData.saveKnowledge, {
                chatbotId: args.chatbotId,
                url: item.url,
                title: item.title,
                content: item.content,
                embedding: vector,
              });
              return 1; // 1 sukses
            }
          }
        } catch (e) {
          console.error(`Failed to embed chunk. Error:`, e);
        }
        return 0; // 0 gagal
      });

      // Tunggu seluruh request Gemini API di batch ini selesai secara paralel
      const batchResults = await Promise.all(batchPromises);
      savedChunks += batchResults.reduce<number>((acc, curr) => acc + curr, 0);

      // Tahan eksekusi sebelum melanjutkan ke batch berikutnya (hindari TPM Limit)
      if (i + BATCH_SIZE < allChunks.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    return {
      success: true,
      message: `Berhasil scrap dan ekstrak ${results.length} URL. Dipecah menjadi ${savedChunks} bagian knowledge.`,
    };
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
      model: "gemini-embedding-001",
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
