import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_URL!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
