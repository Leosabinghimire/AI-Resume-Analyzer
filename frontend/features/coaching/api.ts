"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Feedback, InterviewPrep, InterviewPrepSummary, Page } from "@/types/api";

export function useGenerateFeedback(resumeId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { resume_version_id: string; job_id?: string | null }) =>
      apiFetch<Feedback>("/feedback", { method: "POST", body: input }),
    onSuccess: (feedback) => {
      void client.invalidateQueries({ queryKey: queryKeys.resumes.feedback(resumeId, feedback.resume_version_id) });
      void client.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useDeleteFeedback(resumeId: string, versionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/feedback/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.resumes.feedback(resumeId, versionId) }),
  });
}

export function useInterviewPreps(page = 1) {
  return useQuery({
    queryKey: queryKeys.interviewPreps.list(page),
    queryFn: () => apiFetch<Page<InterviewPrepSummary>>("/interview-prep", { query: { page, page_size: 20 } }),
  });
}

export function useInterviewPrep(id: string) {
  return useQuery({
    queryKey: queryKeys.interviewPreps.detail(id),
    queryFn: () => apiFetch<InterviewPrep>(`/interview-prep/${id}`),
  });
}

export function useGenerateInterviewPrep() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { resume_version_id: string; job_id: string }) =>
      apiFetch<InterviewPrep>("/interview-prep", { method: "POST", body: input }),
    onSuccess: (prep) => {
      client.setQueryData(queryKeys.interviewPreps.detail(prep.id), prep);
      void client.invalidateQueries({ queryKey: queryKeys.interviewPreps.all });
      void client.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useDeleteInterviewPrep() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/interview-prep/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.interviewPreps.all });
      void client.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
