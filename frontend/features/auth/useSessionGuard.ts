"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { ApiError, onUnauthorized } from "@/lib/api-client";
import { useMe } from "./api";

/**
 * Loads the current user and sends the visitor to /login whenever the session is missing or expires
 * (on first load or on any later 401). Redirects are relative, so the browser keeps its current host.
 */
export function useSessionGuard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useMe();

  const redirectToLogin = useCallback(
    (reason: string) => {
      queryClient.clear();
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?next=${next}${reason === "session_expired" ? "&expired=1" : ""}`);
    },
    [queryClient, router],
  );

  useEffect(() => {
    onUnauthorized(redirectToLogin);
    return () => onUnauthorized(null);
  }, [redirectToLogin]);

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) redirectToLogin(me.error.code);
  }, [me.error, redirectToLogin]);

  const unreachable = Boolean(me.error) && !(me.error instanceof ApiError && me.error.status === 401);
  return { user: me.data, unreachable };
}
