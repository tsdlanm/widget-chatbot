"use client";

import { Bot, MoreVertical, Trash2, User } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

type ChatHeaderProps = {
  visitorName: string;
  onClearConversation: () => void;
};

export function ChatHeader({
  visitorName,
  onClearConversation,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-sm leading-5 font-semibold text-slate-900">
            Support Chat
          </h1>
          <p className="text-xs text-slate-500">We usually reply instantly</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {visitorName ? (
          <span className="inline-flex max-w-30 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
            <User className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{visitorName}</span>
          </span>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100"
              suppressHydrationWarning
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 text-sm">
            <DropdownMenuItem
              className="cursor-pointer font-medium text-destructive focus:text-destructive"
              onClick={onClearConversation}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus Obrolan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
