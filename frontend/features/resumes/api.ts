"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, buildUrl } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Feedback,
  Page,
  Resume,
  ResumeData,
  ResumeDetail,
  ResumeUploadResult,
  ResumeVersion,
  VersionComparison,
} from "@/types/api";

export const PAGE_SIZE = 12;

export function useResumes(q = "", page = 1) {
  return useQuery({
    queryKey: queryKeys.resumes.list(q, page),
    queryFn: () => apiFetch<Page<Resume>>("/resumes", { query: { q, page, page_size: PAGE_SIZE } }),
    placeholderData: keepPreviousData,
  });
}

/** All resumes for pickers (bounded to the API's max page size). */
export function useAllResumes() {
  return useQuery({
    queryKey: queryKeys.resumes.list("", 0),
    queryFn: () => apiFetch<Page<Resume>>("/resumes", { query: { page_size: 100 } }),
  });
}

export function useResume(id: string) {
  return useQuery({ queryKey: queryKeys.resumes.detail(id), queryFn: () => apiFetch<ResumeDetail>(`/resumes/${id}`) });
}

export function useResumeVersion(resumeId: string, versionId: string | null) {
  return useQuery({
    queryKey: queryKeys.resumes.version(resumeId, versionId ?? ""),
    queryFn: () => apiFetch<ResumeVersion>(`/resumes/${resumeId}/versions/${versionId}`),
    enabled: Boolean(versionId),
  });
}

export function useResumeText(resumeId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.resumes.text(resumeId),
    queryFn: () => apiFetch<{ raw_text: string }>(`/resumes/${resumeId}/text`),
    enabled,
  });
}

export function useVersionComparison(resumeId: string, base: string | null, target: string | null) {
  return useQuery({
    queryKey: queryKeys.resumes.compare(resumeId, base ?? "", target ?? ""),
    queryFn: () =>
      apiFetch<VersionComparison>(`/resumes/${resumeId}/versions/compare`, { query: { base, target } }),
    enabled: Boolean(base && target && base !== target),
  });
}

export function useVersionFeedback(resumeId: string, versionId: string | null) {
  return useQuery({
    queryKey: queryKeys.resumes.feedback(resumeId, versionId ?? ""),
    queryFn: () => apiFetch<Feedback[]>(`/resumes/${resumeId}/versions/${versionId}/feedback`),
    enabled: Boolean(versionId),
  });
}

export function useUploadResume() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ file, title }: { file: File; title?: string }) => {
      const form = new FormData();
      form.append("file", file);
      if (title) form.append("title", title);
      return apiFetch<ResumeUploadResult>("/resumes", { method: "POST", body: form });
    },
    onSuccess: (result) => {
      // Seed the detail cache so the parse warnings returned by the upload are shown on the next page.
      client.setQueryData(queryKeys.resumes.detail(result.resume.id), result.resume);
      client.setQueryData(queryKeys.resumes.version(result.resume.id, result.version.id), result.version);
      void client.invalidateQueries({ queryKey: queryKeys.resumes.all });
      void client.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useRenameResume(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => apiFetch<ResumeDetail>(`/resumes/${id}`, { method: "PATCH", body: { title } }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.resumes.all }),
  });
}

export function useDeleteResume() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/resumes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.resumes.all });
      void client.invalidateQueries({ queryKey: queryKeys.analyses.all });
      void client.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

function useInvalidateResume(resumeId: string) {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: queryKeys.resumes.all });
    void client.invalidateQueries({ queryKey: queryKeys.analyses.all });
    void client.invalidateQueries({ queryKey: queryKeys.dashboard });
    void client.invalidateQueries({ queryKey: queryKeys.resumes.detail(resumeId) });
  };
}

export function useCreateVersion(resumeId: string) {
  const invalidate = useInvalidateResume(resumeId);
  return useMutation({
    mutationFn: (input: { label: string; source: "manual" | "ai_assisted"; data: ResumeData }) =>
      apiFetch<ResumeVersion>(`/resumes/${resumeId}/versions`, { method: "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateVersion(resumeId: string, versionId: string) {
  const invalidate = useInvalidateResume(resumeId);
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { label?: string; data?: ResumeData }) =>
      apiFetch<ResumeVersion>(`/resumes/${resumeId}/versions/${versionId}`, { method: "PATCH", body: input }),
    onSuccess: (version) => {
      client.setQueryData(queryKeys.resumes.version(resumeId, versionId), version);
      invalidate();
    },
  });
}

export function useDeleteVersion(resumeId: string) {
  const invalidate = useInvalidateResume(resumeId);
  return useMutation({
    mutationFn: (versionId: string) =>
      apiFetch<void>(`/resumes/${resumeId}/versions/${versionId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useReparseResume(resumeId: string) {
  const invalidate = useInvalidateResume(resumeId);
  return useMutation({
    mutationFn: () => apiFetch<ResumeVersion>(`/resumes/${resumeId}/reparse`, { method: "POST" }),
    onSuccess: invalidate,
  });
}

export const originalFileUrl = (resumeId: string) => buildUrl(`/resumes/${resumeId}/file`);
export const exportPdfUrl = (resumeId: string, versionId: string) =>
  buildUrl(`/resumes/${resumeId}/versions/${versionId}/export.pdf`);
