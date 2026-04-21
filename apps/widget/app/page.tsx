"use client";

import { Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Spinner } from "@workspace/ui/components/spinner";
import { ChatHeader } from "@/components/chat-header";
import { ClearConfirmModal } from "@/components/clear-confirm-modal";
import { MessageInput } from "@/components/message-input";
import { MessageList } from "@/components/message-list";
import { NamePromptModal } from "@/components/name-prompt-modal";
import { RateLimitAlert } from "@/components/rate-limit-alert";
import { WidgetErrorAlert } from "@/components/widget-error-alert";
import { useChatActions } from "@/hooks/use-chat-actions";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useConversationInit } from "@/hooks/use-conversation-init";
import { useMessageState } from "@/hooks/use-message-state";
import { useRateLimit } from "@/hooks/use-rate-limit";

function ChatInterface() {
  const searchParams = useSearchParams();
  const apiKeyPrefix = searchParams.get("key");
  const fallbackApiKey = Array.from(searchParams.keys())[0] ?? null;
  const apiKey =
    apiKeyPrefix || (fallbackApiKey !== "key" ? fallbackApiKey : null);

  const scrollViewportRef = useRef<HTMLDivElement>(null);

  const getOrCreateMutation = useMutation(api.conversations.getOrCreate);
  const updateConversationMetadataMutation = useMutation(
    api.conversations.updateConversationMetadata
  );
  const clearMessagesMutation = useMutation(api.conversations.clearMessages);
  const sendMessageMutation = useAction(api.messages.send);

  const {
    isAuthorizing,
    conversationId,
    initError,
    visitorName,
    nameDraft,
    showNamePrompt,
    isSavingName,
    nameError,
    setNameDraft,
    submitName,
  } = useConversationInit({
    apiKey,
    getOrCreateMutation,
    updateConversationMetadataMutation,
  });

  const backendMessages = useQuery(
    api.conversations.getMessages,
    conversationId ? { conversationId } : "skip"
  );
  const { messages, setMessages, setPendingMessage } =
    useMessageState(backendMessages);
  const { rateLimitError, timeLeft, setRateLimitError, setRetryAfter } =
    useRateLimit();

  const {
    draft,
    isTyping,
    widgetError,
    showClearConfirm,
    setDraft,
    setShowClearConfirm,
    submitMessage,
    handleClearConversation,
    performClearConversation,
  } = useChatActions({
    conversationId,
    sendMessageMutation,
    clearMessagesMutation,
    setMessages,
    setPendingMessage,
    setRateLimitError,
    setRetryAfter,
  });

  useChatScroll({ scrollViewportRef, messages, isTyping });

  if (isAuthorizing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white p-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <Spinner className="h-4 w-4 text-slate-500" />
          <span>Mengotorisasi widget...</span>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white p-4">
        <Alert className="max-w-sm rounded-2xl border-orange-200 bg-orange-50 text-orange-900 shadow-sm">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-sm font-medium">
            {initError}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-white font-sans text-slate-950">
      <section className="flex h-full w-full flex-col">
        <ChatHeader
          visitorName={visitorName}
          onClearConversation={handleClearConversation}
        />

        <NamePromptModal
          isOpen={showNamePrompt}
          nameDraft={nameDraft}
          nameError={nameError}
          isSavingName={isSavingName}
          onNameDraftChange={setNameDraft}
          onSubmit={submitName}
        />

        <ClearConfirmModal
          isOpen={showClearConfirm}
          onCancel={() => setShowClearConfirm(false)}
          onConfirm={performClearConversation}
        />

        <MessageList
          messages={messages}
          isTyping={isTyping}
          scrollViewportRef={scrollViewportRef}
        />

        {rateLimitError ? (
          <RateLimitAlert rateLimitError={rateLimitError} timeLeft={timeLeft} />
        ) : null}

        {widgetError && !rateLimitError ? (
          <WidgetErrorAlert widgetError={widgetError} />
        ) : null}

        <MessageInput
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={() => submitMessage(draft)}
          rateLimitError={rateLimitError}
          widgetError={widgetError}
          hasConversation={!!conversationId}
          showNamePrompt={showNamePrompt}
          isTyping={isTyping}
        />
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-sm">Initializing...</div>}
    >
      <ChatInterface />
    </Suspense>
  );
}
