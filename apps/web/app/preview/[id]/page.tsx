"use client";

import * as React from "react";
import Script from "next/script";

import { useConvexAuth, useQuery } from "convex/react";

import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

export default function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { isLoading, isAuthenticated } = useConvexAuth();
  const chatbot = useQuery(
    api.chatbots.getChatbot,
    isLoading || !isAuthenticated ? "skip" : { chatbotId: id as Id<"chatbots"> }
  );

  const widgetBaseUrl = process.env.NEXT_PUBLIC_WIDGET_URL;
  const widgetScriptUrl = React.useMemo(() => {
    if (!widgetBaseUrl) {
      return null;
    }

    return `${widgetBaseUrl.replace(/\/$/, "")}/widget.js`;
  }, [widgetBaseUrl]);

  if (isLoading) {
    return (
      <div className="p-6 text-muted-foreground">Memuat autentikasi...</div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-muted-foreground">
        Anda belum terautentikasi.
      </div>
    );
  }

  if (chatbot === undefined) {
    return <div className="p-6 text-muted-foreground">Memuat chatbot...</div>;
  }

  if (!widgetScriptUrl) {
    return (
      <div className="p-6 text-muted-foreground">
        NEXT_PUBLIC_WIDGET_URL belum disetel.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Widget Preview</h1>
        <p className="text-muted-foreground">
          Halaman ini otomatis memuat script embed untuk chatbot: {chatbot.name}
        </p>
      </div>

      <Script
        id={`chatbot-widget-preview-${chatbot._id}`}
        type="module"
        crossOrigin="anonymous"
        src={widgetScriptUrl}
        data-api-key={chatbot.apiKey}
        strategy="afterInteractive"
      />
    </main>
  );
}
