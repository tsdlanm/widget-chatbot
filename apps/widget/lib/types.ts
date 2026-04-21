export type SessionInfo = {
  visitorUrl: string;
  visitorAgent: string;
  visitorLanguage: string;
  visitorTimezone: string;
  visitorReferrer?: string;
  visitorPlatform: string;
  visitorViewportWidth: number;
  visitorViewportHeight: number;
};

export type ChatMessage = {
  _id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: number;
};

export type SendMessageResult =
  | { success: true; text: string }
  | {
      error: true;
      code:
        | "RATE_LIMITED"
        | "CHATBOT_INACTIVE"
        | "CONVERSATION_NOT_FOUND"
        | "AI_ERROR"
        | string;
      message?: string;
      retryAfter?: number;
    };
