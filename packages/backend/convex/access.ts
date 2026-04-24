import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const requestAccess = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Cek apakah email sudah ada
    const existing = await ctx.db
      .query("accessRequests")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      return existing; // Jika sudah ada, kembalikan data yang ada
    }

    const now = Date.now();
    const newRequestId = await ctx.db.insert("accessRequests", {
      email: args.email,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(newRequestId);
  },
});

export const getAccessStatus = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("accessRequests")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const getPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    // Ambil semua request (karena Convex belum punya indeks multi-field mudah untuk status filter saja,
    // kita filter di code. Bisa dioptimasi dengan indeks nanti jika data ribuan)
    const allRequests = await ctx.db
      .query("accessRequests")
      .order("desc")
      .collect();
    return allRequests; // Admin mungkin butuh lihat semua, termasuk rejected/approved history
  },
});

export const updateAccessStatus = mutation({
  args: {
    id: v.id("accessRequests"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const deleteAccessRequest = mutation({
  args: {
    id: v.id("accessRequests"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
