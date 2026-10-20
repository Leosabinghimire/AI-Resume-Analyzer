"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { findBulletPath } from "@/features/resumes/draft";
import { notifySuccess, notifyWarning } from "@/lib/notify";
import type { ResumeData } from "@/types/api";

/** Applies feedback suggestions to the resume draft (never directly to a saved version). */
export function useApplySuggestions(onApplied: () => void) {
  const { getValues, setValue } = useFormContext<ResumeData>();
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const mark = (key: string) => {
    setApplied((prev) => new Set(prev).add(key));
    onApplied();
  };

  /** Replace a bullet (or the summary) whose current text matches `original`. */
  const replaceText = (original: string, replacement: string, key: string): boolean => {
    const current = getValues();
    if (current.summary.trim() === original.trim()) {
      setValue("summary", replacement, { shouldDirty: true });
    } else {
      const path = findBulletPath(current, original);
      if (!path) {
        notifyWarning("That text was changed or removed in the editor, so the suggestion cannot be applied.");
        return false;
      }
      setValue(path, replacement, { shouldDirty: true });
    }
    mark(key);
    return true;
  };

  return {
    isApplied: (key: string) => applied.has(key),
    applyBullet: (original: string, suggestion: string) => {
      if (replaceText(original, suggestion, `bullet:${original}`)) {
        notifySuccess("Suggestion applied to your draft. Review it in the Editor tab before saving.");
      }
    },
    applyGrammar: (original: string, suggestion: string) => replaceText(original, suggestion, `grammar:${original}`),
    applySummary: (summary: string) => {
      setValue("summary", summary, { shouldDirty: true });
      mark("summary");
      notifySuccess("Summary applied to your draft.");
    },
  };
}
