"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Job, JobInput, JobSummary, JobUpdate, Page } from "@/types/api";

export const JOBS_PAGE_SIZE = 15;

export function useJobs(q = "", page = 1) {
  return useQuery({
    queryKey: queryKeys.jobs.list(q, page),
    queryFn: () => apiFetch<Page<JobSummary>>("/jobs", { query: { q, page, page_size: JOBS_PAGE_SIZE } }),
    placeholderData: keepPreviousData,
  });
}

export function useAllJobs() {
  return useQuery({
    queryKey: queryKeys.jobs.list("", 0),
    queryFn: () => apiFetch<Page<JobSummary>>("/jobs", { query: { page_size: 100 } }),
  });
}

export function useJob(id: string) {
  return useQuery({ queryKey: queryKeys.jobs.detail(id), queryFn: () => apiFetch<Job>(`/jobs/${id}`) });
}

function useInvalidateJobs() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: queryKeys.jobs.all });
    void client.invalidateQueries({ queryKey: queryKeys.analyses.all });
    void client.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

export function useCreateJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (input: JobInput) => apiFetch<Job>("/jobs", { method: "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateJob(id: string) {
  const invalidate = useInvalidateJobs();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: JobUpdate) => apiFetch<Job>(`/jobs/${id}`, { method: "PATCH", body: input }),
    onSuccess: (job) => {
      client.setQueryData(queryKeys.jobs.detail(id), job);
      invalidate();
    },
  });
}

export function useResetJobSkills(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<Job>(`/jobs/${id}/reset-skills`, { method: "POST" }),
    onSuccess: (job) => client.setQueryData(queryKeys.jobs.detail(id), job),
  });
}

export function useDeleteJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/jobs/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
