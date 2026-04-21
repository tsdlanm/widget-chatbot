import type { ReactNode } from "react";

import { Id } from "@workspace/backend/convex/_generated/dataModel";
import { redirect } from "next/navigation";

import { ChatbotDetailShell } from "../_components/chatbot-detail-shell";

export default async function ChatbotLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: { id: string } | Promise<{ id: string }>;
}>) {
  const resolvedParams = await params;

  if (!resolvedParams?.id) {
    redirect("/dashboard/chatbots");
  }

  return (
    <ChatbotDetailShell chatbotId={resolvedParams.id as Id<"chatbots">}>
      {children}
    </ChatbotDetailShell>
  );
}
