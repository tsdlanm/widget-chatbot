import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Id } from "@workspace/backend/convex/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";

import { ConversationViewer } from "../../../_components/conversation-viewer";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string; conversationId: string }>;
}) {
  const { id, conversationId } = await params;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/dashboard/chatbots/${id}/conversations`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Daftar Session
        </Link>
      </Button>

      <ConversationViewer
        conversationId={conversationId as Id<"conversations">}
      />
    </div>
  );
}
