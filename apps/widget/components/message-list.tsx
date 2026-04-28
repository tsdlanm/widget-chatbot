"use client";

import { RefObject } from "react";
import { Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { ChatMessage } from "@/lib/types";

type MessageListProps = {
  messages: ChatMessage[];
  isTyping: boolean;
  scrollViewportRef: RefObject<HTMLDivElement | null>;
  onSuggestedPromptClick?: (prompt: string) => void;
};

export function MessageList({
  messages,
  isTyping,
  scrollViewportRef,
  onSuggestedPromptClick,
}: MessageListProps) {
  return (
    <div
      ref={scrollViewportRef}
      className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth px-4 py-4"
    >
      <div className="min-w-0 space-y-4">
        {messages.map((message) => {
          const isAssistant = message.role === "assistant";

          return (
            <div
              key={message._id}
              className={`flex min-w-0 ${isAssistant ? "justify-start" : "justify-end"}`}
            >
              {isAssistant && (
                <div className="mt-1 mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm">
                  <Bot className="h-3 w-3" />
                </div>
              )}
              <div
                className={`max-w-[80%] min-w-0 rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  isAssistant
                    ? "rounded-tl-sm border border-slate-100 bg-slate-50 text-slate-900"
                    : "rounded-tr-sm bg-slate-950 text-white"
                }`}
              >
                <div
                  className={`prose prose-sm wrap-anywhere ${
                    !isAssistant
                      ? "prose-headings:text-white prose-p:text-white prose-a:text-white prose-blockquote:text-white/80 prose-strong:text-white prose-em:text-white prose-code:text-white prose-pre:bg-white/10 prose-li:text-white prose-li:marker:text-white/60 prose-th:text-white prose-td:text-white prose-hr:border-white/20"
                      : ""
                  }`}
                >
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => (
                        <a
                          {...props}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                <div
                  className={`mt-1.5 flex items-center text-[10px] ${isAssistant ? "text-slate-400" : "text-white/60"}`}
                >
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                {message._id === "initial-greeting" &&
                  !isTyping &&
                  messages.length === 1 && (
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className="mb-2 text-[11px] font-medium text-slate-500">
                        Saran pertanyaan:
                      </p>
                      <button
                        onClick={() =>
                          onSuggestedPromptClick?.(
                            "Daftar layanan utama di website ini apa saja?"
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100"
                      >
                        "Daftar layanan utama di website ini apa saja?"
                      </button>
                    </div>
                  )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm">
              <Bot className="h-3 w-3" />
            </div>
            <div className="flex items-center rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-4 py-3 text-sm shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              </div>
            </div>
          </div>
        )}

        <div className="h-1 w-full shrink-0" />
      </div>
    </div>
  );
}
