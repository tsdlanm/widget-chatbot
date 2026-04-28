import {
  internalMutation,
  internalQuery,
  MutationCtx,
  QueryCtx,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

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

async function ensureKnowledgeFileOwner(
  ctx: MutationCtx,
  fileId: Id<"knowledgeFiles">
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const file = await ctx.db.get(fileId);
  if (!file) {
    throw new Error("File tidak ditemukan");
  }

  const chatbot = await ctx.db.get(file.chatbotId);
  if (!chatbot || chatbot.userId !== identity.subject) {
    throw new Error("Chatbot not found or unauthorized");
  }

  return file;
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const getKnowledgeFiles = query({
  args: {
    chatbotId: v.id("chatbots"),
  },
  handler: async (ctx, args) => {
    await ensureChatbotOwner(ctx, args.chatbotId);

    const files = await ctx.db
      .query("knowledgeFiles")
      .withIndex("by_chatbot", (q) => q.eq("chatbotId", args.chatbotId))
      .order("desc")
      .collect();

    return await Promise.all(
      files.map(async (file) => ({
        ...file,
        fileUrl: await ctx.storage.getUrl(file.storageId),
      }))
    );
  },
});

export const removeKnowledgeFile = mutation({
  args: {
    fileId: v.id("knowledgeFiles"),
  },
  handler: async (ctx, args) => {
    const file = await ensureKnowledgeFileOwner(ctx, args.fileId);

    if (file.status === "processing") {
      throw new Error("File masih sedang diproses, coba lagi beberapa saat.");
    }

    await ctx.runMutation(internal.knowledgeData.removeKnowledgeByFileId, {
      fileId: file._id,
    });

    try {
      await ctx.storage.delete(file.storageId);
    } catch (error) {
      console.warn("Failed to delete storage file", error);
    }

    await ctx.db.delete(file._id);

    return { success: true };
  },
});

export const createKnowledgeFile = internalMutation({
  args: {
    chatbotId: v.id("chatbots"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.optional(v.string()),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("knowledgeFiles", {
      chatbotId: args.chatbotId,
      storageId: args.storageId,
      fileName: args.fileName,
      contentType: args.contentType,
      sizeBytes: args.sizeBytes,
      status: "processing",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const markKnowledgeFileReady = internalMutation({
  args: {
    fileId: v.id("knowledgeFiles"),
    pageCount: v.number(),
    chunkCount: v.number(),
    previewText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      status: "ready",
      pageCount: args.pageCount,
      chunkCount: args.chunkCount,
      previewText: args.previewText,
      updatedAt: Date.now(),
    });
  },
});

export const markKnowledgeFileFailed = internalMutation({
  args: {
    fileId: v.id("knowledgeFiles"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      status: "failed",
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
  },
});

export const getStorageMetadata = internalQuery({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const metadata = await ctx.db.system.get("_storage", args.storageId);

    if (!metadata) {
      return null;
    }

    return {
      _id: metadata._id,
      contentType: metadata.contentType ?? undefined,
      size: metadata.size,
      sha256: metadata.sha256,
    };
  },
});
