import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { GoogleGenAI } from "@google/genai";
import { Id } from "./_generated/dataModel";

function sanitizeAssistantResponse(rawText: string) {
  let content = rawText;

  // Remove complete <think>...</think> blocks first.
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, " ");

  // Handle unclosed <think> tag — everything from <think> to end is reasoning.
  content = content.replace(/<think>[\s\S]*/gi, " ");

  // Handle orphan </think> — everything before it (with no opening tag) is reasoning.
  content = content.replace(/[\s\S]*?<\/think>/gi, " ");

  // Remove any remaining orphan think tags.
  content = content.replace(/<\/?think\b[^>]*>/gi, " ");

  // Remove escaped think tags if the model returns them as plain text.
  content = content.replace(/&lt;\/?think\b[^&]*&gt;/gi, " ");

  // Normalize excessive spacing/newlines after cleanup.
  content = content
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return content;
}

export const prepareSend = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return {
        error: true,
        code: "CONVERSATION_NOT_FOUND",
        message: "Conversation not found",
      } as const;
    }

    const chatbot = await ctx.db.get(conversation.chatbotId);
    if (!chatbot || !chatbot.isActive) {
      return {
        error: true,
        code: "CHATBOT_INACTIVE",
        message: "Chatbot is inactive or missing",
      } as const;
    }

    // Check rate limit
    const rateLimitCheck = await ctx.db
      .query("rateLimits")
      .withIndex("by_session", (q) =>
        q.eq("chatbotId", chatbot._id).eq("sessionId", conversation.sessionId)
      )
      .first();

    const now = Date.now();
    const MAX_MESSAGES = 50;
    const WINDOW_MS = 60 * 60 * 1000;

    if (rateLimitCheck) {
      if (
        now - rateLimitCheck.windowStart <= WINDOW_MS &&
        rateLimitCheck.count >= MAX_MESSAGES
      ) {
        return {
          error: true,
          code: "RATE_LIMITED",
          message: "Anda telah mencapai batas pesan.",
          retryAfter: rateLimitCheck.windowStart + WINDOW_MS,
        };
      }
      if (now - rateLimitCheck.windowStart > WINDOW_MS) {
        await ctx.db.patch(rateLimitCheck._id, { count: 1, windowStart: now });
      } else {
        await ctx.db.patch(rateLimitCheck._id, {
          count: rateLimitCheck.count + 1,
        });
      }
    } else {
      await ctx.db.insert("rateLimits", {
        chatbotId: chatbot._id,
        sessionId: conversation.sessionId,
        count: 1,
        windowStart: now,
      });
    }

    // Save user message
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
      createdAt: Date.now(),
    });

    if ((conversation.messageCount ?? 0) === 0) {
      await ctx.db.patch(chatbot._id, {
        totalSessions: (chatbot.totalSessions ?? 0) + 1,
      });
    }

    await ctx.db.patch(conversation._id, {
      messageCount: (conversation.messageCount ?? 0) + 1,
      lastMessageAt: Date.now(),
    });

    // Get previous messages (limit 10)
    const history = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(10);

    return {
      success: true,
      chatbotId: chatbot._id,
      systemPrompt: chatbot.systemPrompt,
      aiModel: chatbot.aiModel || "groq",
      history: history.reverse(), // oldest first
    };
  },
});

export const saveResponse = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: args.content,
      createdAt: Date.now(),
    });

    const chatbot = await ctx.db.get(conversation.chatbotId);
    if (chatbot) {
      await ctx.db.patch(chatbot._id, {
        totalReplies: (chatbot.totalReplies ?? 0) + 1,
      });
    }

    await ctx.db.patch(conversation._id, {
      messageCount: (conversation.messageCount ?? 0) + 1,
      lastMessageAt: Date.now(),
    });
  },
});

export const send = action({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const prep = (await ctx.runMutation(internal.messages.prepareSend, {
      conversationId: args.conversationId,
      content: args.content,
    })) as {
      error?: boolean;
      code?: string;
      message?: string;
      retryAfter?: number;
      success?: boolean;
      systemPrompt?: string;
      history?: any[];
      chatbotId?: Id<"chatbots">;
      aiModel?: string;
    };

    if (prep.error) {
      return prep;
    }

    const systemPrompt = prep.systemPrompt as string;
    const history = prep.history as any[];
    const chatbotId = prep.chatbotId as Id<"chatbots">;
    const aiModel = prep.aiModel as string;

    let ragSystemPrompt = systemPrompt;

    // Siapkan riwayat percakapan untuk LLM (mengabaikan pesan terbaru yang baru diinsert)
    const conversationMessages = history
      .slice(0, Math.max(history.length - 1, 0))
      .map((msg: any) => ({
        role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
        content: msg.content,
      }));

    try {
      // 1. Context-Aware Embedding
      // Ambil 2 pesan terakhir untuk memberi konteks pada embedding (jika user hanya bilang "hai" atau "berapa?")
      const recentContext = conversationMessages
        .slice(-2)
        .map((m: any) => `${m.role === "user" ? "User" : "Bot"}: ${m.content}`)
        .join("\n");

      const embeddingText = recentContext
        ? `Topik Obrolan Terakhir:\n${recentContext}\n\nPertanyaan Baru User: ${args.content}`
        : args.content;

      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (geminiApiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const embedResult = await ai.models.embedContent({
          model: "gemini-embedding-001",
          contents: embeddingText,
        });

        const embedding = embedResult.embeddings?.[0]?.values;
        if (embedding) {
          // 2. Vector Search
          const searchResults = await ctx.vectorSearch(
            "knowledge",
            "by_embedding",
            {
              vector: embedding,
              limit: 5,
              filter: (q) => q.eq("chatbotId", chatbotId),
            }
          );

          const firstResult = searchResults[0];
          if (searchResults.length > 0 && firstResult) {
            // Evaluasi skor tertinggi dari hasil pencarian Vector (Convex menggunakan cosine similarity)
            const topScore = firstResult._score;
            let validSearchIds: Id<"knowledge">[] = [];

            if (topScore > 0.7) {
              // Skor > 0.7: Masukkan chunks ke dalam prompt (RAG aktif penuh, filter skor lumayan)
              validSearchIds = searchResults
                .filter((r) => r._score >= 0.5)
                .map((r) => r._id);
            } else if (topScore >= 0.5) {
              // Skor 0.5 - 0.7: Masukkan hanya 1 chunk teratas sebagai referensi tipis
              validSearchIds = [firstResult._id];
            } else {
              // Skor < 0.5: Jangan masukkan konteks sama sekali (Biarkan array kosong)
              validSearchIds = [];
            }

            // 3. Retrieve chunks jika ada
            if (validSearchIds.length > 0) {
              const docs = await ctx.runQuery(
                internal.knowledgeData.getKnowledgeByIds,
                { ids: validSearchIds }
              );

              if (docs && docs.length > 0) {
                const contexts = docs
                  .map((d: any) => {
                    const sourceLabel =
                      d.sourceType === "file"
                        ? d.sourceName || d.title || d.url
                        : d.url;

                    return `Source (${sourceLabel}):\n${d.content}`;
                  })
                  .join("\n\n");

                // Defensive RAG Prompting
                ragSystemPrompt += `\n\n[PENTING] Berikut adalah referensi dari Knowledge Base. JIKA relevan dengan pertanyaan/topik user saat ini, gunakan untuk menjawab. JIKA TIDAK RELEVAN (misal user hanya menyapa), ABAIKAN informasi ini dan jawab secara natural:\n${contexts}`;
              }
            }
          }
        }
      }
    } catch (ragError) {
      console.warn(
        "RAG Pipeline error, continuing without custom knowledge",
        ragError
      );
    }

    try {
      let responseText = "";

      if (aiModel === "deepseek") {
        const doApiKey = process.env.DIGITAL_OCEAN_API_KEY?.trim();
        if (!doApiKey) throw new Error("DIGITAL_OCEAN_API_KEY not configured");

        const payload = {
          model: "deepseek-r1-distill-llama-70b",
          messages: [
            { role: "system", content: ragSystemPrompt },
            ...conversationMessages,
            { role: "user", content: args.content },
          ],
          max_tokens: 1000,
        };

        const response = await fetch(
          "https://inference.do-ai.run/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${doApiKey}`,
            },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            `DigitalOcean API error: ${response.statusText} - ${text}`
          );
        }

        const data = await response.json();
        const message = data.choices[0].message;

        // DeepSeek R1 models may return reasoning in a separate
        // `reasoning_content` field. We only want the actual answer
        // from `content`, never the reasoning/thinking output.
        const content = message.content || "";
        responseText = sanitizeAssistantResponse(content);

        // If content is empty after sanitization (model only returned thinking),
        // provide a fallback response.
        if (!responseText) {
          responseText =
            "Maaf, saya tidak bisa memberikan respons yang tepat. Silakan coba lagi.";
        }
      } else {
        const groqApiKey = process.env.GROQ_API_KEY?.trim();
        if (!groqApiKey) throw new Error("GROQ_API_KEY not configured");

        const result = await generateText({
          model: groq("llama-3.3-70b-versatile"),
          system: ragSystemPrompt,
          messages: [
            ...conversationMessages,
            { role: "user", content: args.content },
          ],
        });

        responseText = sanitizeAssistantResponse(result.text);
      }

      await ctx.runMutation(internal.messages.saveResponse, {
        conversationId: args.conversationId,
        content: responseText,
      });

      return { success: true, text: responseText };
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      return {
        error: true,
        code: "AI_ERROR",
        message: "Maaf, terjadi kesalahan pada layanan AI.",
      };
    }
  },
});
