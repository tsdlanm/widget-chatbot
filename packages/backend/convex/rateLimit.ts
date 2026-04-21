import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MAX_MESSAGES = 50;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const listByChatbot = query({
  args: {
    chatbotId: v.id("chatbots"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rateLimits = await ctx.db
      .query("rateLimits")
      .withIndex("by_session", (q) => q.eq("chatbotId", args.chatbotId))
      .collect();

    const entries = await Promise.all(
      rateLimits
        .sort((left, right) => right.windowStart - left.windowStart)
        .map(async (rateLimit) => {
          const windowExpiresAt = rateLimit.windowStart + WINDOW_MS;
          const isWindowActive = now - rateLimit.windowStart <= WINDOW_MS;
          const messagesUsed = isWindowActive
            ? rateLimit.count
            : Math.min(rateLimit.count, MAX_MESSAGES);

          const conversation = await ctx.db
            .query("conversations")
            .withIndex("by_session", (q) =>
              q
                .eq("chatbotId", rateLimit.chatbotId)
                .eq("sessionId", rateLimit.sessionId)
            )
            .first();

          return {
            ...rateLimit,
            visitorName: conversation?.metadata?.visitorName,
            status: isWindowActive
              ? rateLimit.count >= MAX_MESSAGES
                ? "limited"
                : "active"
              : "expired",
            messagesUsed,
            remainingMessages: Math.max(MAX_MESSAGES - messagesUsed, 0),
            windowExpiresAt,
            msUntilReset: Math.max(windowExpiresAt - now, 0),
          };
        })
    );

    return {
      entries,
      summary: {
        totalSessions: entries.length,
        activeSessions: entries.filter((entry) => entry.status !== "expired")
          .length,
        limitedSessions: entries.filter((entry) => entry.status === "limited")
          .length,
        totalMessages: entries.reduce(
          (sum, entry) => sum + entry.messagesUsed,
          0
        ),
      },
      limits: {
        maxMessages: MAX_MESSAGES,
        windowMs: WINDOW_MS,
      },
    };
  },
});

export const checkAndIncrement = internalMutation({
  args: {
    chatbotId: v.id("chatbots"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_session", (q) =>
        q.eq("chatbotId", args.chatbotId).eq("sessionId", args.sessionId)
      )
      .first();

    const now = Date.now();

    if (!rateLimit) {
      await ctx.db.insert("rateLimits", {
        chatbotId: args.chatbotId,
        sessionId: args.sessionId,
        count: 1,
        windowStart: now,
      });
      return { success: true };
    }

    if (now - rateLimit.windowStart > WINDOW_MS) {
      // Reset window
      await ctx.db.patch(rateLimit._id, {
        count: 1,
        windowStart: now,
      });
      return { success: true };
    }

    if (rateLimit.count >= MAX_MESSAGES) {
      return {
        success: false,
        retryAfter: rateLimit.windowStart + WINDOW_MS,
      };
    }

    // Increment
    await ctx.db.patch(rateLimit._id, {
      count: rateLimit.count + 1,
    });
    return { success: true };
  },
});

export const deleteOne = mutation({
  args: {
    rateLimitId: v.id("rateLimits"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const rateLimit = await ctx.db.get(args.rateLimitId);
    if (!rateLimit) {
      throw new Error("Rate limit record not found");
    }

    const chatbot = await ctx.db.get(rateLimit.chatbotId);
    if (!chatbot || chatbot.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.rateLimitId);
    return { success: true };
  },
});

export const deleteAllByChatbot = mutation({
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

    const rateLimits = await ctx.db
      .query("rateLimits")
      .withIndex("by_session", (q) => q.eq("chatbotId", args.chatbotId))
      .collect();

    for (const rl of rateLimits) {
      await ctx.db.delete(rl._id);
    }

    return { success: true, deleted: rateLimits.length };
  },
});
