"use client";

import { useEffect, useRef, useState } from "react";

import { ChatMessage } from "@/lib/types";

type BackendMessage = {
  _id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: number;
};

function dedupeById(messages: ChatMessage[]) {
  const seen = new Set<string>();
  const uniqueMessages: ChatMessage[] = [];

  for (const message of messages) {
    if (seen.has(message._id)) {
      continue;
    }

    seen.add(message._id);
    uniqueMessages.push(message);
  }

  return uniqueMessages;
}

export function useMessageState(backendMessages: BackendMessage[] | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingMessage, setPendingMessage] = useState<ChatMessage | null>(
    null
  );
  const confirmedMessageIdMapRef = useRef(new Map<string, string>());

  useEffect(() => {
    if (!backendMessages) {
      return;
    }

    const toNormalizedMessages = () =>
      dedupeById(
        backendMessages.map((message) => ({
          ...message,
          _id: confirmedMessageIdMapRef.current.get(message._id) ?? message._id,
        }))
      );

    if (!pendingMessage) {
      setMessages(toNormalizedMessages());
      return;
    }

    const matchingMessage = [...backendMessages].reverse().find((message) => {
      return (
        message.role === "user" &&
        message.content === pendingMessage.content &&
        Math.abs(message.createdAt - pendingMessage.createdAt) < 15000
      );
    });

    if (matchingMessage) {
      confirmedMessageIdMapRef.current.set(
        matchingMessage._id,
        pendingMessage._id
      );
      setPendingMessage(null);
      setMessages(toNormalizedMessages());
    }
  }, [backendMessages, pendingMessage]);

  return {
    messages,
    pendingMessage,
    setMessages,
    setPendingMessage,
  };
}
