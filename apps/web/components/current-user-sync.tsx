"use client";

import { useEffect, useRef } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

export default function CurrentUserSync() {
  const { isAuthenticated } = useConvexAuth();
  const syncCurrentUser = useMutation(api.users.syncCurrentUser);
  const didSyncRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    if (didSyncRef.current) {
      return;
    }

    didSyncRef.current = true;
    void syncCurrentUser().catch(console.error);
  }, [isAuthenticated, syncCurrentUser]);

  return null;
}
