import { mutation } from "./_generated/server";
import { query } from "./_generated/server";

export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new Error("Unauthorized");
    }

    const tokenIdentifier = identity.subject;
    const email = identity.email ?? "";
    const name = identity.name ?? email ?? tokenIdentifier;
    const pictureUrl = identity.pictureUrl ?? "";

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", tokenIdentifier)
      )
      .unique();

    if (existingUser !== null) {
      await ctx.db.patch(existingUser._id, {
        email,
        name,
        pictureUrl,
        tokenIdentifier,
      });

      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      email,
      name,
      pictureUrl,
      tokenIdentifier,
    });
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return null;
    }

    const syncedUser = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.subject)
      )
      .unique();

    return {
      userId: identity.subject,
      email: syncedUser?.email ?? identity.email,
      name: syncedUser?.name ?? identity.name,
    };
  },
});
