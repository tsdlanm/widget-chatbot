import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    pictureUrl: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),

  chatbots: defineTable({
    userId: v.string(),
    name: v.string(),
    systemPrompt: v.string(),
    allowedDomain: v.optional(v.string()),
    apiKey: v.string(),
    createdAt: v.number(),
    isActive: v.boolean(),
    aiModel: v.optional(v.union(v.literal("groq"), v.literal("deepseek"))),
    totalReplies: v.optional(v.number()),
    totalSessions: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_apiKey", ["apiKey"]),

  conversations: defineTable({
    chatbotId: v.id("chatbots"),
    sessionId: v.string(),
    createdAt: v.number(),
    messageCount: v.optional(v.number()),
    lastMessageAt: v.optional(v.number()),
    metadata: v.object({
      visitorName: v.optional(v.string()),
      visitorUrl: v.optional(v.string()),
      visitorAgent: v.optional(v.string()),
      visitorLanguage: v.optional(v.string()),
      visitorTimezone: v.optional(v.string()),
      visitorReferrer: v.optional(v.string()),
      visitorPlatform: v.optional(v.string()),
      visitorViewportWidth: v.optional(v.number()),
      visitorViewportHeight: v.optional(v.number()),
    }),
  })
    .index("by_chatbot", ["chatbotId"])
    .index("by_session", ["chatbotId", "sessionId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  rateLimits: defineTable({
    sessionId: v.string(),
    chatbotId: v.id("chatbots"),
    count: v.number(),
    windowStart: v.number(),
  }).index("by_session", ["chatbotId", "sessionId"]),

  knowledge: defineTable({
    chatbotId: v.id("chatbots"),
    url: v.string(),
    title: v.optional(v.string()),
    content: v.string(), // chunked markdown
    embedding: v.array(v.float64()),
    createdAt: v.number(),
  })
    .index("by_chatbot", ["chatbotId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 3072, // gemini embedding dimension
      filterFields: ["chatbotId"],
    }),

  accessRequests: defineTable({
    email: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),
});
