"use client";

import { useEffect, useState } from "react";

export function useRateLimit() {
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!retryAfter) {
      return;
    }

    const interval = window.setInterval(() => {
      const now = Date.now();
      const diff = retryAfter - now;

      if (diff <= 0) {
        setRateLimitError(null);
        setRetryAfter(null);
        window.clearInterval(interval);
      } else {
        const minutes = Math.ceil(diff / 60000);
        setTimeLeft(`${minutes} menit`);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [retryAfter]);

  return {
    rateLimitError,
    retryAfter,
    timeLeft,
    setRateLimitError,
    setRetryAfter,
  };
}
