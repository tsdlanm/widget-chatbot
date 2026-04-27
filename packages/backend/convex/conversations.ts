import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function toDomainParts(value?: string) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    return {
      hostname: parsed.hostname,
      port: parsed.port || null,
    };
  } catch {
    return null;
  }
}

function isDomainAllowed(allowedDomains: Array<string | undefined>, candidate?: string) {
  const normalizedCandidate = toDomainParts(candidate);

  if (!normalizedCandidate) {
    return false;
  }

  return allowedDomains.some((allowedDomain) => {
    const normalizedAllowedDomain = toDomainParts(allowedDomain);

    if (!normalizedAllowedDomain) {
      return false;
    }

    const isHostnameAllowed =
      normalizedCandidate.hostname === normalizedAllowedDomain.hostname ||
      normalizedCandidate.hostname.endsWith(
        `.${normalizedAllowedDomain.hostname}`
      );

    if (!isHostnameAllowed) {
      return false;
    }

    // If allowedDomain includes an explicit port, require the same port.
    if (normalizedAllowedDomain.port) {
      return normalizedCandidate.port === normalizedAllowedDomain.port;
    }

    return true;
  });
}

function getSystemAllowedDomain() {
  return process.env.WEB_ALLOWED_DOMAIN_URL?.trim() || undefined;
}

function mergeDefined<T extends Record<string, unknown>>(
  base: T,
  patch: Partial<T>
) {
  const merged: Record<string, unknown> = { ...base };

  Object.entries(patch).forEach(([key, value]) => {
    if (value !== undefined) {
      merged[key] = value;
    }
  });

  return merged as T;
}

export const getOrCreate = mutation({
  args: {
    apiKey: v.string(),
    sessionId: v.string(),
    visitorName: v.optional(v.string()),
    visitorUrl: v.optional(v.string()),
    visitorAgent: v.optional(v.string()),
    visitorLanguage: v.optional(v.string()),
    visitorTimezone: v.optional(v.string()),
    visitorReferrer: v.optional(v.string()),
    visitorPlatform: v.optional(v.string()),
    visitorViewportWidth: v.optional(v.number()),
    visitorViewportHeight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Find chatbot by apiKey
    const chatbot = await ctx.db
      .query("chatbots")
      .withIndex("by_apiKey", (q) => q.eq("apiKey", args.apiKey))
      .first();

    if (!chatbot || !chatbot.isActive) {
      return {
        ok: false as const,
        code: "INVALID_API_KEY" as const,
        message: "Invalid or inactive API key",
      };
    }

    // visitorUrl now contains the actual parent page URL, passed reliably
    // from the embed script via ?origin= query param. Use it for domain check.
    if (
      !isDomainAllowed(
        [chatbot.allowedDomain, getSystemAllowedDomain()],
        args.visitorUrl
      )
    ) {
      return {
        ok: false as const,
        code: "DOMAIN_FORBIDDEN" as const,
        message: "Domain not allowed for this chatbot",
      };
    }

    // 2. Find conversation by sessionId
    const existingConversation = await ctx.db
      .query("conversations")
      .withIndex("by_session", (q) =>
        q.eq("chatbotId", chatbot._id).eq("sessionId", args.sessionId)
      )
      .first();

    if (existingConversation) {
      const nextMetadata = mergeDefined(existingConversation.metadata, {
        visitorName: args.visitorName,
        visitorUrl: args.visitorUrl,
        visitorAgent: args.visitorAgent,
        visitorLanguage: args.visitorLanguage,
        visitorTimezone: args.visitorTimezone,
        visitorReferrer: args.visitorReferrer,
        visitorPlatform: args.visitorPlatform,
        visitorViewportWidth: args.visitorViewportWidth,
        visitorViewportHeight: args.visitorViewportHeight,
      });

      await ctx.db.patch(existingConversation._id, {
        metadata: nextMetadata,
      });

      return {
        ok: true as const,
        conversationId: existingConversation._id,
      };
    }

    // 3. Create new conversation
    const conversationId = await ctx.db.insert("conversations", {
      chatbotId: chatbot._id,
      sessionId: args.sessionId,
      createdAt: Date.now(),
      messageCount: 0,
      lastMessageAt: Date.now(),
      metadata: {
        visitorName: args.visitorName,
        visitorUrl: args.visitorUrl,
        visitorAgent: args.visitorAgent,
        visitorLanguage: args.visitorLanguage,
        visitorTimezone: args.visitorTimezone,
        visitorReferrer: args.visitorReferrer,
        visitorPlatform: args.visitorPlatform,
        visitorViewportWidth: args.visitorViewportWidth,
        visitorViewportHeight: args.visitorViewportHeight,
      },
    });

    return {
      ok: true as const,
      conversationId,
    };
  },
});

export const updateConversationMetadata = mutation({
  args: {
    conversationId: v.id("conversations"),
    visitorName: v.optional(v.string()),
    visitorUrl: v.optional(v.string()),
    visitorAgent: v.optional(v.string()),
    visitorLanguage: v.optional(v.string()),
    visitorTimezone: v.optional(v.string()),
    visitorReferrer: v.optional(v.string()),
    visitorPlatform: v.optional(v.string()),
    visitorViewportWidth: v.optional(v.number()),
    visitorViewportHeight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      metadata: mergeDefined(conversation.metadata, {
        visitorName: args.visitorName,
        visitorUrl: args.visitorUrl,
        visitorAgent: args.visitorAgent,
        visitorLanguage: args.visitorLanguage,
        visitorTimezone: args.visitorTimezone,
        visitorReferrer: args.visitorReferrer,
        visitorPlatform: args.visitorPlatform,
        visitorViewportWidth: args.visitorViewportWidth,
        visitorViewportHeight: args.visitorViewportHeight,
      }),
    });

    return { success: true };
  },
});

export const listByBot = query({
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
      throw new Error("Unauthorized");
    }

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_chatbot", (q) => q.eq("chatbotId", args.chatbotId))
      .collect();

    return conversations
      .map((conversation) => ({
        ...conversation,
        messageCount: conversation.messageCount ?? 0,
        lastMessageAt: conversation.lastMessageAt ?? conversation.createdAt,
      }))
      .sort(
        (left, right) =>
          (right.lastMessageAt ?? right.createdAt) -
          (left.lastMessageAt ?? left.createdAt)
      );
  },
});

export const getConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const chatbot = await ctx.db.get(conversation.chatbotId);
    if (!chatbot || chatbot.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    return {
      ...conversation,
      messageCount: conversation.messageCount ?? 0,
      lastMessageAt: conversation.lastMessageAt ?? conversation.createdAt,
    };
  },
});

export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});

export const clearMessages = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.patch(args.conversationId, {
      messageCount: 0,
      lastMessageAt: Date.now(),
    });

    return { success: true };
  },
});

export const deleteConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const chatbot = await ctx.db.get(conversation.chatbotId);
    if (!chatbot || chatbot.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Delete all messages first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Delete related rate limit record
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_session", (q) =>
        q
          .eq("chatbotId", conversation.chatbotId)
          .eq("sessionId", conversation.sessionId)
      )
      .first();

    if (rateLimit) {
      await ctx.db.delete(rateLimit._id);
    }

    await ctx.db.delete(args.conversationId);
    return { success: true };
  },
});

export const deleteAllByBot = mutation({
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
      throw new Error("Unauthorized");
    }

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_chatbot", (q) => q.eq("chatbotId", args.chatbotId))
      .collect();

    for (const conv of conversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();

      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      // Delete related rate limit
      const rateLimit = await ctx.db
        .query("rateLimits")
        .withIndex("by_session", (q) =>
          q.eq("chatbotId", conv.chatbotId).eq("sessionId", conv.sessionId)
        )
        .first();

      if (rateLimit) {
        await ctx.db.delete(rateLimit._id);
      }

      await ctx.db.delete(conv._id);
    }

    return { success: true, deleted: conversations.length };
  },
});
