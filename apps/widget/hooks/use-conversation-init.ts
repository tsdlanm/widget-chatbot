"use client";

import { useEffect, useRef, useState } from "react";

import { Id } from "@workspace/backend/convex/_generated/dataModel";

import { SessionInfo } from "@/lib/types";

type GetOrCreateResult =
  | { ok: true; conversationId: Id<"conversations"> }
  | { ok: false; code: string; message: string };

type GetOrCreateMutation = (args: {
  apiKey: string;
  sessionId: string;
  visitorUrl?: string;
  visitorReferrer?: string;
}) => Promise<GetOrCreateResult>;

type UpdateConversationMetadataMutation = (args: {
  conversationId: Id<"conversations">;
  visitorName?: string;
  visitorUrl: string;
  visitorAgent: string;
  visitorLanguage: string;
  visitorTimezone: string;
  visitorReferrer?: string;
  visitorPlatform: string;
  visitorViewportWidth: number;
  visitorViewportHeight: number;
}) => Promise<unknown>;

type UseConversationInitArgs = {
  apiKey: string | null;
  getOrCreateMutation: GetOrCreateMutation;
  updateConversationMetadataMutation: UpdateConversationMetadataMutation;
};

export function useConversationInit({
  apiKey,
  getOrCreateMutation,
  updateConversationMetadataMutation,
}: UseConversationInitArgs) {
  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const [conversationId, setConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const sessionInfoRef = useRef<SessionInfo | null>(null);

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

  const collectSessionInfo = () => {
    // The embed script passes the parent page URL via ?origin= query param.
    // This is the actual customer website URL (reliable, unlike document.referrer
    // which is often empty in cross-origin iframes due to referrer policies).
    const params = new URLSearchParams(window.location.search);
    const embedOrigin = params.get("origin");

    return {
      visitorUrl: embedOrigin || document.referrer || window.location.href,
      visitorAgent: navigator.userAgent,
      visitorLanguage: navigator.language,
      visitorTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      visitorReferrer: document.referrer || undefined,
      visitorPlatform: navigator.platform,
      visitorViewportWidth: window.innerWidth,
      visitorViewportHeight: window.innerHeight,
    };
  };

  const persistVisitorProfile = async (
    nextConversationId: Id<"conversations">,
    nextName?: string
  ) => {
    const sessionInfo = sessionInfoRef.current;

    if (!sessionInfo) {
      return;
    }

    await updateConversationMetadataMutation({
      conversationId: nextConversationId,
      visitorName: nextName?.trim() || undefined,
      visitorUrl: sessionInfo.visitorUrl,
      visitorAgent: sessionInfo.visitorAgent,
      visitorLanguage: sessionInfo.visitorLanguage,
      visitorTimezone: sessionInfo.visitorTimezone,
      visitorReferrer: sessionInfo.visitorReferrer,
      visitorPlatform: sessionInfo.visitorPlatform,
      visitorViewportWidth: sessionInfo.visitorViewportWidth,
      visitorViewportHeight: sessionInfo.visitorViewportHeight,
    });
  };

  useEffect(() => {
    if (!apiKey) {
      setInitError(
        "API Key tidak ditemukan. Pastikan parameter URL ?key= API_KEY disertakan."
      );
      setIsAuthorizing(false);
      return;
    }

    const initSession = async () => {
      let currentSessionId = localStorage.getItem(`chat_session_${apiKey}`);
      if (!currentSessionId) {
        currentSessionId = crypto.randomUUID();
        localStorage.setItem(`chat_session_${apiKey}`, currentSessionId);
      }

      const sessionInfo = collectSessionInfo();
      sessionInfoRef.current = sessionInfo;

      try {
        const createConversationResult = await getOrCreateMutation({
          apiKey,
          sessionId: currentSessionId,
          visitorUrl: sessionInfo.visitorUrl,
          visitorReferrer: sessionInfo.visitorReferrer,
        });
        if (!createConversationResult.ok) {
          if (createConversationResult.code === "DOMAIN_FORBIDDEN") {
            setInitError(
              "Domain website ini tidak diizinkan untuk chatbot ini."
            );
            return;
          }

          setInitError(
            "Chatbot ini sedang dinonaktifkan. Silakan coba lagi nanti."
          );
          return;
        }

        const convId = createConversationResult.conversationId;
        setConversationId(convId);

        const savedName = localStorage.getItem(`chat_name_${apiKey}`)?.trim();
        if (savedName) {
          setVisitorName(savedName);
          setNameDraft(savedName);
          setShowNamePrompt(false);
        } else {
          setVisitorName("");
          setNameDraft("");
          setShowNamePrompt(true);
        }

        // Sync visitor metadata in background so the widget UI can become ready sooner.
        void persistVisitorProfile(convId, savedName || undefined);
      } catch (error: unknown) {
        setInitError(
          isInactiveChatbotError(error)
            ? "Chatbot ini sedang dinonaktifkan. Silakan coba lagi nanti."
            : "Gagal terhubung ke server chatbot. Coba beberapa saat lagi."
        );
      } finally {
        setIsAuthorizing(false);
      }
    };

    initSession();
  }, [apiKey]);

  async function submitName() {
    const trimmedName = nameDraft.trim();

    if (!trimmedName || !conversationId || !apiKey) {
      setNameError("Nama wajib diisi.");
      return;
    }

    setIsSavingName(true);
    setNameError(null);

    try {
      await persistVisitorProfile(conversationId, trimmedName);
      localStorage.setItem(`chat_name_${apiKey}`, trimmedName);
      setVisitorName(trimmedName);
      setShowNamePrompt(false);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setNameError(error.message || "Gagal menyimpan nama.");
      } else {
        setNameError("Gagal menyimpan nama.");
      }
    } finally {
      setIsSavingName(false);
    }
  }

  return {
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
  };
}
