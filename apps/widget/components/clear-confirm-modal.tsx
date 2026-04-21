"use client";

import { Button } from "@workspace/ui/components/button";

type ClearConfirmModalProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ClearConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
}: ClearConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 flex animate-in items-center justify-center bg-black/40 p-4 backdrop-blur-sm fade-in-0">
      <div className="w-full max-w-xs animate-in rounded-xl border border-slate-200 bg-white p-5 shadow-xl zoom-in-95">
        <div className="mb-6 space-y-2">
          <h3 className="font-semibold text-slate-900">Hapus Riwayat</h3>
          <p className="text-sm text-slate-500">
            Yakin ingin menghapus seluruh riwayat obrolan ini?
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Batal
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Hapus
          </Button>
        </div>
      </div>
    </div>
  );
}
