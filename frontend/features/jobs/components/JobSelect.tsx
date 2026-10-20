"use client";

import { Select, type SelectProps } from "@mantine/core";
import { useAllJobs } from "../api";

type JobSelectProps = Omit<SelectProps, "data" | "value" | "onChange"> & {
  value: string | null;
  onChange: (jobId: string | null) => void;
};

/** Searchable picker over the user's saved jobs. */
export function JobSelect({ value, onChange, label = "Job", placeholder = "Choose a job", ...rest }: JobSelectProps) {
  const jobs = useAllJobs();
  const data = (jobs.data?.items ?? []).map((j) => ({
    value: j.id,
    label: j.company ? `${j.title} · ${j.company}` : j.title,
  }));
  return (
    <Select
      label={label}
      placeholder={jobs.isPending ? "Loading jobs…" : placeholder}
      data={data}
      value={value}
      onChange={onChange}
      searchable
      nothingFoundMessage="No saved jobs"
      {...rest}
    />
  );
}
