"use client";

import { RefObject, useEffect } from "react";

import { ChatMessage } from "@/lib/types";

type UseChatScrollArgs = {
  scrollViewportRef: RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
  isTyping: boolean;
};

export function useChatScroll({
  scrollViewportRef,
  messages,
  isTyping,
}: UseChatScrollArgs) {
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  }, [scrollViewportRef, messages, isTyping]);
}
