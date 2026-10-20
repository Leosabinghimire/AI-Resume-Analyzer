import type { Priority, VersionSource } from "@/types/api";

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  high: { label: "High", color: "red" },
  medium: { label: "Medium", color: "yellow" },
  low: { label: "Low", color: "gray" },
};

export const VERSION_SOURCE_META: Record<VersionSource, { label: string; color: string }> = {
  parsed: { label: "Parsed", color: "gray" },
  manual: { label: "Manual edit", color: "blue" },
  ai_assisted: { label: "AI-assisted", color: "violet" },
};

export const MAX_COMPARE = 4;
