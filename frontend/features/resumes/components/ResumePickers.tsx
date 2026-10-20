"use client";

import { Select, SimpleGrid, type SelectProps } from "@mantine/core";
import { useEffect, useState } from "react";
import { useAllResumes, useResume } from "../api";

type ResumeSelectProps = Omit<SelectProps, "data" | "value" | "onChange"> & {
  value: string | null;
  onChange: (resumeId: string | null) => void;
};

/** Searchable picker over the user's resumes. */
export function ResumeSelect({ value, onChange, label = "Resume", placeholder = "Choose a resume", ...rest }: ResumeSelectProps) {
  const resumes = useAllResumes();
  return (
    <Select
      label={label}
      placeholder={resumes.isPending ? "Loading resumes…" : placeholder}
      data={(resumes.data?.items ?? []).map((r) => ({ value: r.id, label: r.title }))}
      value={value}
      onChange={onChange}
      searchable
      nothingFoundMessage="No resumes"
      {...rest}
    />
  );
}

interface ResumeVersionPickerProps {
  /** Selected version id; the picker defaults to the latest version of the chosen resume. */
  value: string | null;
  onChange: (versionId: string | null) => void;
  initialResumeId?: string | null;
}

/** Two linked selects: a resume, then one of its versions. */
export function ResumeVersionPicker({ value, onChange, initialResumeId }: ResumeVersionPickerProps) {
  const resumes = useAllResumes();
  const [resumeId, setResumeId] = useState<string | null>(initialResumeId ?? null);
  const items = resumes.data?.items ?? [];
  const activeResumeId =
    (resumeId && items.some((r) => r.id === resumeId) ? resumeId : null) ??
    items.find((r) => r.latest_version?.id === value)?.id ??
    items[0]?.id ??
    null;
  const resume = useResume(activeResumeId ?? "");
  const versions = resume.data?.id === activeResumeId ? resume.data.versions : [];
  const latestId = versions[versions.length - 1]?.id ?? null;
  const valueBelongs = versions.some((v) => v.id === value);

  // Keep the selected version consistent with the selected resume.
  useEffect(() => {
    if (versions.length && !valueBelongs) onChange(latestId);
  }, [versions.length, valueBelongs, latestId, onChange]);

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
      <ResumeSelect
        value={activeResumeId}
        onChange={(id) => {
          setResumeId(id);
          onChange(null);
        }}
        allowDeselect={false}
      />
      <Select
        label="Version"
        data={versions.map((v) => ({ value: v.id, label: `v${v.version_number} · ${v.label}` }))}
        value={valueBelongs ? value : null}
        onChange={onChange}
        allowDeselect={false}
        disabled={!versions.length}
        placeholder={resume.isFetching ? "Loading versions…" : "Choose a version"}
      />
    </SimpleGrid>
  );
}
