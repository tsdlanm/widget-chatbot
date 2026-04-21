"use client";

import { useEffect, useRef } from "react";
import { Send } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";

type MessageInputProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  rateLimitError: string | null;
  widgetError: string | null;
  hasConversation: boolean;
  showNamePrompt: boolean;
  isTyping: boolean;
};

export function MessageInput({
  draft,
  onDraftChange,
  onSubmit,
  rateLimitError,
  widgetError,
  hasConversation,
  showNamePrompt,
  isTyping,
}: MessageInputProps) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const isDisabled =
    !!rateLimitError || !!widgetError || !hasConversation || showNamePrompt;

  useEffect(() => {
    const textarea = textAreaRef.current;
    if (!textarea) {
      return;
    }

    const maxHeight = 144;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [draft]);

  return (
    <>
      <Separator className="bg-slate-200" />

      <footer className="bg-slate-50/50 px-4 py-3">
        <form
          className="relative space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div
            className={`rounded-xl border py-1 pr-1 pl-2 shadow-sm transition-colors ${
              rateLimitError
                ? "border-slate-200 bg-slate-100"
                : "border-slate-300 bg-white focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500"
            }`}
          >
            <div className="flex items-end gap-1.5">
              <div className="relative min-w-0 flex-1">
                <Textarea
                  ref={textAreaRef}
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      if (!isDisabled && draft.trim() && !isTyping) {
                        onSubmit();
                      }
                    }
                  }}
                  rows={1}
                  placeholder={
                    widgetError
                      ? "Chatbot sedang tidak aktif..."
                      : rateLimitError
                        ? "Limit pesan tercapai..."
                        : "Type your message..."
                  }
                  disabled={isDisabled}
                  aria-label="Message input"
                  className="max-h-36 min-h-10 w-full resize-none border-0 bg-transparent px-2 py-2 pr-12 text-sm leading-5 shadow-none placeholder:text-slate-400 focus-visible:ring-0 disabled:opacity-50"
                  suppressHydrationWarning
                />

                <Button
                  type="submit"
                  disabled={isDisabled || !draft.trim() || isTyping}
                  size="icon"
                  className="absolute right-1 bottom-1 h-8 w-8 rounded-lg bg-slate-950 text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400 disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center justify-center gap-1.5">
            <p className="text-[10px] font-medium text-slate-400">
              Powered by workspace
            </p>
          </div>
        </form>
      </footer>
    </>
  );
}
