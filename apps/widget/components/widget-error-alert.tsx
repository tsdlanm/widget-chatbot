"use client";

import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@workspace/ui/components/alert";

type WidgetErrorAlertProps = {
  widgetError: string;
};

export function WidgetErrorAlert({ widgetError }: WidgetErrorAlertProps) {
  return (
    <div className="px-4 py-2">
      <Alert className="flex items-center gap-2 rounded-xl border-orange-200 bg-orange-50 px-3 py-2.5 text-orange-900 shadow-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-orange-600" />
        <AlertDescription className="text-xs font-medium">
          {widgetError}
        </AlertDescription>
      </Alert>
    </div>
  );
}
