import {
  internalMutation,
  internalQuery,
  MutationCtx,
  QueryCtx,
  query,
  mutation,
} from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

async function ensureChatbotOwner(
  ctx: QueryCtx | MutationCtx,
  chatbotId: Id<"chatbots">
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const chatbot = await ctx.db.get(chatbotId);
  if (!chatbot || chatbot.userId !== identity.subject) {
    throw new Error("Chatbot not found or unauthorized");
  }

  return chatbot;
}

async function ensureKnowledgeOwner(
  ctx: MutationCtx,
  knowledgeId: Id<"knowledge">
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const knowledge = await ctx.db.get(knowledgeId);
  if (!knowledge) {
    throw new Error("Knowledge not found");
  }

  const chatbot = await ctx.db.get(knowledge.chatbotId);
  if (!chatbot || chatbot.userId !== identity.subject) {
    throw new Error("Chatbot not found or unauthorized");
  }

  return knowledge;
}

export const saveKnowledge = internalMutation({
  args: {
    chatbotId: v.id("chatbots"),
    url: v.string(),
    title: v.optional(v.string()),
    content: v.string(),
    sourceType: v.optional(v.union(v.literal("website"), v.literal("file"))),
    fileId: v.optional(v.id("knowledgeFiles")),
    sourceName: v.optional(v.string()),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("knowledge", {
      chatbotId: args.chatbotId,
      url: args.url,
      title: args.title,
      content: args.content,
      sourceType: args.sourceType,
      fileId: args.fileId,
      sourceName: args.sourceName,
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
  args: {
    chatbotId: v.id("chatbots"),
    sourceType: v.optional(v.union(v.literal("website"), v.literal("file"))),
  },
  handler: async (ctx, args) => {
    await ensureChatbotOwner(ctx, args.chatbotId);

    const docs = await ctx.db
      .query("knowledge")
      .withIndex("by_chatbot", (q) => q.eq("chatbotId", args.chatbotId))
      .order("desc")
      .collect();

    const filteredDocs = docs.filter((doc) => {
      if (!args.sourceType) {
        return true;
      }

      if (args.sourceType === "website") {
        return doc.sourceType !== "file";
      }

      return doc.sourceType === "file";
    });

    // Exclude embedding array to save bandwidth
    return filteredDocs.map((d) => ({
      _id: d._id,
      url: d.url,
      title: d.title,
      content: d.content,
      sourceType: d.sourceType,
      fileId: d.fileId,
      sourceName: d.sourceName,
      createdAt: d.createdAt,
    }));
  },
});

export const removeKnowledge = mutation({
  args: { knowledgeId: v.id("knowledge") },
  handler: async (ctx, args) => {
    await ensureKnowledgeOwner(ctx, args.knowledgeId);
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

export const removeKnowledgeByFileId = internalMutation({
  args: {
    fileId: v.id("knowledgeFiles"),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("knowledge")
      .withIndex("by_fileId", (q) => q.eq("fileId", args.fileId))
      .collect();

    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
  },
});

export const removeAllBySourceType = mutation({
  args: {
    chatbotId: v.id("chatbots"),
    sourceType: v.union(v.literal("website"), v.literal("file")),
  },
  handler: async (ctx, args) => {
    await ensureChatbotOwner(ctx, args.chatbotId);

    const docs = await ctx.db
      .query("knowledge")
      .withIndex("by_chatbot", (q) => q.eq("chatbotId", args.chatbotId))
      .collect();

    const filteredDocs = docs.filter((doc) =>
      args.sourceType === "website"
        ? doc.sourceType !== "file"
        : doc.sourceType === "file"
    );

    for (const doc of filteredDocs) {
      await ctx.db.delete(doc._id);
    }

    return { success: true, deletedCount: filteredDocs.length };
  },
});
