import {
  internalMutation,
  internalQuery,
  query,
  mutation,
} from "./_generated/server";
import { v } from "convex/values";

export const saveKnowledge = internalMutation({
  args: {
    chatbotId: v.id("chatbots"),
    url: v.string(),
    title: v.optional(v.string()),
    content: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("knowledge", {
      chatbotId: args.chatbotId,
      url: args.url,
      title: args.title,
      content: args.content,
      embedding: args.embedding,
      createdAt: Date.now(),
    });
  },
});

export const getKnowledgeByIds = internalQuery({
  args: { ids: v.array(v.id("knowledge")) },
  handler: async (ctx, args) => {
    const docs = [];
    for (const id of args.ids) {
      const doc = await ctx.db.get(id);
      if (doc) docs.push(doc);
    }
    return docs;
  },
});

export const getKnowledge = query({
  args: { chatbotId: v.id("chatbots") },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("knowledge")
      .withIndex("by_chatbot", (q) => q.eq("chatbotId", args.chatbotId))
      .order("desc")
      .collect();

    // Exclude embedding array to save bandwidth
    return docs.map((d) => ({
      _id: d._id,
      url: d.url,
      title: d.title,
      content: d.content,
      createdAt: d.createdAt,
    }));
  },
});

export const removeKnowledge = mutation({
  args: { knowledgeId: v.id("knowledge") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.knowledgeId);
  },
});

export const updateKnowledgeData = internalMutation({
  args: {
    knowledgeId: v.id("knowledge"),
    content: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.knowledgeId, {
      content: args.content,
      embedding: args.embedding,
    });
  },
});
