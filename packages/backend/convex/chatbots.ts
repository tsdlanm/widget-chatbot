import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function normalizeDomainInput(input?: string) {
  if (!input) {
    return undefined;
  }

  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    return undefined;
  }

  const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    return parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
  } catch {
    throw new Error("Invalid allowed domain format");
  }
}

export const createChatbot = mutation({
  args: {
    name: v.string(),
    systemPrompt: v.string(),
    allowedDomain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const apiKey = crypto.randomUUID();

    const chatbotId = await ctx.db.insert("chatbots", {
      userId: identity.subject, // the userId from Clerk/auth
      name: args.name,
      systemPrompt: args.systemPrompt,
      allowedDomain: normalizeDomainInput(args.allowedDomain),
      apiKey: apiKey,
      createdAt: Date.now(),
      isActive: true,
      aiModel: "groq",
      totalReplies: 0,
      totalSessions: 0,
    });

    return chatbotId;
  },
});

export const listChatbots = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("chatbots")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const getChatbot = query({
  args: {
    chatbotId: v.id("chatbots"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const chatbot = await ctx.db.get(args.chatbotId);
    if (!chatbot || chatbot.userId !== identity.subject) {
      throw new Error("Chatbot not found or unauthorized");
    }
    return chatbot;
  },
});

export const updateChatbot = mutation({
  args: {
    chatbotId: v.id("chatbots"),
    name: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    allowedDomain: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    aiModel: v.optional(v.union(v.literal("groq"), v.literal("deepseek"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const chatbot = await ctx.db.get(args.chatbotId);
    if (!chatbot || chatbot.userId !== identity.subject) {
      throw new Error("Chatbot not found or unauthorized");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.systemPrompt !== undefined)
      updates.systemPrompt = args.systemPrompt;
    if (Object.prototype.hasOwnProperty.call(args, "allowedDomain")) {
      updates.allowedDomain = normalizeDomainInput(args.allowedDomain);
    }
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.aiModel !== undefined) updates.aiModel = args.aiModel;

    await ctx.db.patch(args.chatbotId, updates);
  },
});

export const deleteChatbot = mutation({
  args: {
    chatbotId: v.id("chatbots"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const chatbot = await ctx.db.get(args.chatbotId);
    if (!chatbot || chatbot.userId !== identity.subject) {
      throw new Error("Chatbot not found or unauthorized");
    }

    // Delete conversations
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_chatbot", (q) => q.eq("chatbotId", args.chatbotId))
      .collect();

    for (const conv of conversations) {
      // Delete messages
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();

      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      await ctx.db.delete(conv._id);
    }

    await ctx.db.delete(args.chatbotId);
  },
});

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const chatbots = await ctx.db
      .query("chatbots")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const stats = chatbots.map((bot) => ({
      botName: bot.name,
      replies: bot.totalReplies ?? 0,
      sessions: bot.totalSessions ?? 0,
    }));

    return stats;
  },
});

export const syncStats = mutation({
  args: {},
  handler: async (ctx) => {
    // Migration script — no auth required, processes all chatbots.
    const chatbots = await ctx.db.query("chatbots").collect();

    for (const bot of chatbots) {
      const conversations = await ctx.db
        .query("conversations")
        .withIndex("by_chatbot", (q) => q.eq("chatbotId", bot._id))
        .collect();

      let botRepliesCount = 0;
      let botActiveSessionsCount = 0;

      for (const conv of conversations) {
        if ((conv.messageCount ?? 0) > 0) {
          botActiveSessionsCount++;
        }

        const msgs = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .filter((q) => q.eq(q.field("role"), "assistant"))
          .collect();
        botRepliesCount += msgs.length;
      }

      await ctx.db.patch(bot._id, {
        totalReplies: botRepliesCount,
        totalSessions: botActiveSessionsCount,
      });
    }

    return { success: true };
  },
});
