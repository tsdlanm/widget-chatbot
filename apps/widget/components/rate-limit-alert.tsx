"use client";

import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@workspace/ui/components/alert";

type RateLimitAlertProps = {
  rateLimitError: string;
  timeLeft: string;
};

export function RateLimitAlert({
  rateLimitError,
  timeLeft,
}: RateLimitAlertProps) {
  return (
    <div className="px-4 py-2">
      <Alert
        variant="destructive"
        className="flex items-center gap-2 rounded-xl border-orange-200 bg-orange-50 px-3 py-2.5 text-orange-900 shadow-sm"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-orange-600" />
        <AlertDescription className="text-xs font-medium">
          {rateLimitError} {timeLeft && `Coba lagi dalam ${timeLeft}.`}
        </AlertDescription>
      </Alert>
    </div>
  );
}
