"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

type NamePromptModalProps = {
  isOpen: boolean;
  nameDraft: string;
  nameError: string | null;
  isSavingName: boolean;
  onNameDraftChange: (value: string) => void;
  onSubmit: () => void;
};

export function NamePromptModal({
  isOpen,
  nameDraft,
  nameError,
  isSavingName,
  onNameDraftChange,
  onSubmit,
}: NamePromptModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4">
          <p className="text-sm font-semibold text-slate-900">
            Masukkan nama Anda
          </p>
        </div>

        <div className="space-y-3">
          <Input
            value={nameDraft}
            onChange={(event) => onNameDraftChange(event.target.value)}
            placeholder="Contoh: Kurniawan"
            aria-label="Visitor name"
            autoFocus
            className="h-11"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmit();
              }
            }}
          />

          {nameError && <p className="text-xs text-red-600">{nameError}</p>}

          <Button
            className="w-full"
            onClick={onSubmit}
            disabled={isSavingName || !nameDraft.trim()}
          >
            {isSavingName ? "Menyimpan..." : "Lanjutkan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
