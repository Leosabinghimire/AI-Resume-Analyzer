import type { AnalysisFilters } from "@/types/api";

export const queryKeys = {
  me: ["me"] as const,
  aiConfig: ["ai-config"] as const,
  dashboard: ["dashboard"] as const,
  resumes: {
    all: ["resumes"] as const,
    list: (q: string, page: number) => ["resumes", "list", q, page] as const,
    detail: (id: string) => ["resumes", "detail", id] as const,
    version: (resumeId: string, versionId: string) => ["resumes", "version", resumeId, versionId] as const,
    text: (id: string) => ["resumes", "text", id] as const,
    compare: (resumeId: string, base: string, target: string) => ["resumes", "compare", resumeId, base, target] as const,
    feedback: (resumeId: string, versionId: string) => ["resumes", "feedback", resumeId, versionId] as const,
  },
  jobs: {
    all: ["jobs"] as const,
    list: (q: string, page: number) => ["jobs", "list", q, page] as const,
    detail: (id: string) => ["jobs", "detail", id] as const,
  },
  analyses: {
    all: ["analyses"] as const,
    list: (filters: AnalysisFilters) => ["analyses", "list", filters] as const,
    detail: (id: string) => ["analyses", "detail", id] as const,
    compare: (ids: string[]) => ["analyses", "compare", ...ids] as const,
  },
  interviewPreps: {
    all: ["interview-preps"] as const,
    list: (page: number) => ["interview-preps", "list", page] as const,
    detail: (id: string) => ["interview-preps", "detail", id] as const,
  },
};
