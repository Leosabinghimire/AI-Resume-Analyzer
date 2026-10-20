"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ApiError } from "@/lib/api-client";
import { notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import type { ResumeData, ResumeVersion } from "@/types/api";
import { useCreateVersion, useUpdateVersion } from "./api";
import { cleanDraft, findPlaceholders } from "./draft";

/**
 * Editable draft of a resume version: form state, unsaved-change protection, and the two save paths
 * (overwrite this version, or save as a new one). Placeholders from suggestions block both.
 */
export function useVersionDraft(resumeId: string, version: ResumeVersion, onCreated: (versionId: string) => void) {
  const form = useForm<ResumeData>({ defaultValues: version.data });
  const [aiApplied, setAiApplied] = useState(false);
  const update = useUpdateVersion(resumeId, version.id);
  const create = useCreateVersion(resumeId);
  const isDirty = form.formState.isDirty;

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const validDraft = (): ResumeData | null => {
    const draft = cleanDraft(form.getValues());
    const placeholders = findPlaceholders(draft);
    if (placeholders.length) {
      notifyWarning(`Replace these placeholders with real information before saving: ${placeholders.join(", ")}`);
      return null;
    }
    return draft;
  };

  const onSaveError = (error: unknown) => {
    if (error instanceof ApiError && error.code === "unresolved_placeholders") notifyWarning(error.message);
    else notifyError(error, "Could not save");
  };

  const saveInPlace = (): boolean => {
    const draft = validDraft();
    if (!draft) return false;
    update.mutate(
      { data: draft },
      {
        onSuccess: (saved) => {
          form.reset(saved.data);
          notifySuccess(`Saved v${saved.version_number}.`);
        },
        onError: onSaveError,
      },
    );
    return true;
  };

  const saveAsNew = (label: string, onDone?: () => void): boolean => {
    const draft = validDraft();
    if (!draft) return false;
    create.mutate(
      { label, source: aiApplied ? "ai_assisted" : "manual", data: draft },
      {
        onSuccess: (created) => {
          onDone?.();
          notifySuccess(`Saved as version ${created.version_number}. The previous version is unchanged.`);
          form.reset(draft);
          onCreated(created.id);
        },
        onError: onSaveError,
      },
    );
    return true;
  };

  return {
    form,
    isDirty,
    aiApplied,
    markAiApplied: () => setAiApplied(true),
    discard: () => form.reset(version.data),
    saveInPlace,
    saveAsNew,
    saving: update.isPending || create.isPending,
    savingInPlace: update.isPending,
    savingNew: create.isPending,
  };
}
