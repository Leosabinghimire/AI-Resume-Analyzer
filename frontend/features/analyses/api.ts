"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Analysis, AnalysisFilters, AnalysisSummary, DashboardSummary, Page } from "@/types/api";

export function useAnalyses(filters: AnalysisFilters) {
  return useQuery({
    queryKey: queryKeys.analyses.list(filters),
    queryFn: () => apiFetch<Page<AnalysisSummary>>("/analyses", { query: { ...filters } }),
    placeholderData: keepPreviousData,
  });
}

export function useAnalysis(id: string) {
  return useQuery({ queryKey: queryKeys.analyses.detail(id), queryFn: () => apiFetch<Analysis>(`/analyses/${id}`) });
}

export function useAnalysisComparison(ids: string[]) {
  return useQuery({
    queryKey: queryKeys.analyses.compare(ids),
    queryFn: () => apiFetch<Analysis[]>("/analyses/compare", { query: { ids } }),
    enabled: ids.length >= 2,
  });
}

function useInvalidateAnalyses() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: queryKeys.analyses.all });
    void client.invalidateQueries({ queryKey: queryKeys.jobs.all });
    void client.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

export function useRunAnalysis() {
  const invalidate = useInvalidateAnalyses();
  return useMutation({
    mutationFn: (input: { resume_version_id: string; job_ids: string[]; include_ai_insights: boolean }) =>
      apiFetch<Analysis[]>("/analyses", { method: "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useRegenerateInsights(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<Analysis>(`/analyses/${id}/insights`, { method: "POST" }),
    onSuccess: (analysis) => client.setQueryData(queryKeys.analyses.detail(id), analysis),
  });
}

export function useDeleteAnalysis() {
  const invalidate = useInvalidateAnalyses();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/analyses/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useDashboard() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: () => apiFetch<DashboardSummary>("/dashboard") });
}
