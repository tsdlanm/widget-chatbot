"use client";

import { Dispatch, SetStateAction, useState } from "react";

import { Id } from "@workspace/backend/convex/_generated/dataModel";

import { ChatMessage } from "@/lib/types";

type SendMessageRawResult = {
  error?: boolean;
  code?: string;
  message?: string;
  retryAfter?: number;
} & Record<string, unknown>;

type SendMessageMutation = (args: {
  conversationId: Id<"conversations">;
  content: string;
}) => Promise<SendMessageRawResult>;

type ClearMessagesMutation = (args: {
  conversationId: Id<"conversations">;
}) => Promise<unknown>;

type UseChatActionsArgs = {
  conversationId: Id<"conversations"> | null;
  sendMessageMutation: SendMessageMutation;
  clearMessagesMutation: ClearMessagesMutation;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPendingMessage: Dispatch<SetStateAction<ChatMessage | null>>;
  setRateLimitError: Dispatch<SetStateAction<string | null>>;
  setRetryAfter: Dispatch<SetStateAction<number | null>>;
};

export function useChatActions({
  conversationId,
  sendMessageMutation,
  clearMessagesMutation,
  setMessages,
  setPendingMessage,
  setRateLimitError,
  setRetryAfter,
}: UseChatActionsArgs) {
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isInactiveChatbotError = (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "";

    return /chatbot is inactive or missing|invalid or inactive api key/i.test(
      message
    );
  };

  const handleClearConversation = async () => {
    if (!conversationId) {
      return;
    }

    setShowClearConfirm(true);
  };

  const performClearConversation = async () => {
    if (!conversationId) {
      setShowClearConfirm(false);
      return;
    }

    try {
      await clearMessagesMutation({ conversationId });
      setMessages([]);
    } catch {
      setWidgetError("Gagal menghapus obrolan. Silakan coba lagi.");
    } finally {
      setShowClearConfirm(false);
    }
  };

  async function submitMessage(message: string) {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !conversationId) {
      return;
    }

    const optimisticMessage: ChatMessage = {
      _id: `optimistic-${crypto.randomUUID()}`,
      role: "user",
      content: trimmedMessage,
      createdAt: Date.now(),
    };

    setDraft("");
    setIsTyping(true);
    setRateLimitError(null);
    setPendingMessage(optimisticMessage);
    setMessages((currentMessages) => [...currentMessages, optimisticMessage]);

    try {
      const response = await sendMessageMutation({
        conversationId,
        content: trimmedMessage,
      });

      if (response && "error" in response && response.error) {
        if (response.code === "RATE_LIMITED") {
          setRateLimitError(response.message || "Batas pesan tercapai.");
          if ("retryAfter" in response && response.retryAfter) {
            setRetryAfter(response.retryAfter);
          }
          setMessages((currentMessages) =>
            currentMessages.filter(
              (currentMessage) => currentMessage._id !== optimisticMessage._id
            )
          );
          setPendingMessage(null);
          return;
        }

        if (
          response.code === "CHATBOT_INACTIVE" ||
          response.code === "CONVERSATION_NOT_FOUND" ||
          response.code === "DOMAIN_FORBIDDEN"
        ) {
          setMessages((currentMessages) =>
            currentMessages.filter(
              (currentMessage) => currentMessage._id !== optimisticMessage._id
            )
          );
          setPendingMessage(null);
          setWidgetError(
            response.message ||
              "Chatbot ini sedang dinonaktifkan. Pesan belum bisa dikirim."
          );
          return;
        }

        setPendingMessage(null);
        setWidgetError(
          response.message ||
            "Terjadi kendala saat mengirim pesan. Silakan coba lagi dalam beberapa saat."
        );
        return;
      }
    } catch (error) {
      setMessages((currentMessages) =>
        currentMessages.filter(
          (currentMessage) => currentMessage._id !== optimisticMessage._id
        )
      );
      setPendingMessage(null);

      if (isInactiveChatbotError(error)) {
        setWidgetError(
          "Chatbot ini sedang dinonaktifkan. Pesan belum bisa dikirim."
        );
        return;
      }

      setWidgetError(
        "Terjadi kendala saat mengirim pesan. Silakan coba lagi dalam beberapa saat."
      );
    } finally {
      setIsTyping(false);
    }
  }

  return {
    draft,
    isTyping,
    widgetError,
    showClearConfirm,
    setDraft,
    setShowClearConfirm,
    setWidgetError,
    submitMessage,
    handleClearConversation,
    performClearConversation,
  };
}
