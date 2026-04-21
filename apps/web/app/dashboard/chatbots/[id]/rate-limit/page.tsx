import { Id } from "@workspace/backend/convex/_generated/dataModel";

import { RateLimitMonitor } from "../../_components/rate-limit-monitor";

export default async function RateLimitPage({
  params,
}: Readonly<{
  params: { id: string } | Promise<{ id: string }>;
}>) {
  const resolvedParams = await params;

  return <RateLimitMonitor chatbotId={resolvedParams.id as Id<"chatbots">} />;
}
