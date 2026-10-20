"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { AIConfig, User } from "@/types/api";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  full_name: string;
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiFetch<User>("/auth/me"),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useAIConfig() {
  return useQuery({ queryKey: queryKeys.aiConfig, queryFn: () => apiFetch<AIConfig>("/users/ai-config") });
}

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => apiFetch<User>("/auth/login", { method: "POST", body: input }),
    onSuccess: (user) => {
      client.clear();
      client.setQueryData(queryKeys.me, user);
    },
  });
}

export function useRegister() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => apiFetch<User>("/auth/register", { method: "POST", body: input }),
    onSuccess: (user) => {
      client.clear();
      client.setQueryData(queryKeys.me, user);
    },
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ message: string }>("/auth/logout", { method: "POST" }),
    onSettled: () => client.clear(),
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch<{ message: string }>("/auth/password-reset/request", { method: "POST", body: { email } }),
  });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: (input: { token: string; new_password: string }) =>
      apiFetch<{ message: string }>("/auth/password-reset/confirm", { method: "POST", body: input }),
  });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { full_name?: string; ai_processing_consent?: boolean }) =>
      apiFetch<User>("/users/me", { method: "PATCH", body: input }),
    onSuccess: (user) => {
      client.setQueryData(queryKeys.me, user);
      void client.invalidateQueries({ queryKey: queryKeys.aiConfig });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { current_password: string; new_password: string }) =>
      apiFetch<User>("/users/me/password", { method: "POST", body: input }),
  });
}

export function useDeleteAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => apiFetch<void>("/users/me", { method: "DELETE", body: { password } }),
    onSuccess: () => client.clear(),
  });
}
