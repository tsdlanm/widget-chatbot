"use client";

import * as React from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { Copy, Check } from "lucide-react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [copied, setCopied] = React.useState(false);
  const chatbot = useQuery(
    api.chatbots.getChatbot,
    isLoading || !isAuthenticated ? "skip" : { chatbotId: id as Id<"chatbots"> }
  );
  const url = process.env.NEXT_PUBLIC_EMBED_URL + "/widget.js";

  const copyEmbedCode = () => {
    if (!chatbot) return;
    const code = `<script type="module" crossorigin="anonymous" src="${url}" data-api-key="${chatbot.apiKey}"></script>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Memuat autentikasi...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="text-muted-foreground">Anda belum terautentikasi.</div>
    );
  }

  if (chatbot === undefined) {
    return <div className="text-muted-foreground">Memuat chatbot...</div>;
  }

  const embedCodeSnippet = `<script type="module" crossorigin="anonymous" src="${url}" data-api-key="${chatbot.apiKey}"></script>`;

  return (
    <div className="">
      <Card>
        <CardHeader>
          <CardTitle>Embed Widget</CardTitle>
          <CardDescription>
            Copy kode script di bawah ini dan paste tepat di atas tag{" "}
            <code className="rounded bg-muted px-1">&lt;/body&gt;</code> di web
            Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <pre className="overflow-x-auto rounded-md bg-slate-950 p-4 text-sm leading-relaxed text-slate-50">
              <code>{embedCodeSnippet}</code>
            </pre>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={copyEmbedCode}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
