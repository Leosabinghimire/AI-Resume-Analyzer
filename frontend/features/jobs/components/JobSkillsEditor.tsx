"use client";

import { Badge, Button, Group, Stack, TagsInput } from "@mantine/core";
import { IconRefresh, IconTags } from "@tabler/icons-react";
import { useState } from "react";
import { SectionCard } from "@/components/ui";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { Job } from "@/types/api";
import { useResetJobSkills, useUpdateJob } from "../api";

const sameList = (a: string[], b: string[]) => a.join("|") === b.join("|");

/** Editable required/preferred skill lists used by the matching engine. */
export function JobSkillsEditor({ job }: { job: Job }) {
  const update = useUpdateJob(job.id);
  const reset = useResetJobSkills(job.id);
  const [required, setRequired] = useState(job.required_skills);
  const [preferred, setPreferred] = useState(job.preferred_skills);
  const changed = !sameList(required, job.required_skills) || !sameList(preferred, job.preferred_skills);
  const sync = (j: Job) => {
    setRequired(j.required_skills);
    setPreferred(j.preferred_skills);
  };

  return (
    <SectionCard
      title="Skills used for matching"
      icon={<IconTags size={18} />}
      description="Extracted from the description. Add or remove skills if extraction missed something."
      actions={job.skills_customized && <Badge variant="light" color="violet">Edited manually</Badge>}
    >
      <Stack gap="md">
        <TagsInput label="Required skills" value={required} onChange={setRequired} maxTags={80} clearable />
        <TagsInput label="Preferred skills" value={preferred} onChange={setPreferred} maxTags={80} clearable />
        <Group justify="flex-end">
          {job.skills_customized && (
            <Button
              variant="subtle"
              leftSection={<IconRefresh size={16} />}
              loading={reset.isPending}
              onClick={() =>
                reset.mutate(undefined, {
                  onSuccess: (j) => {
                    sync(j);
                    notifySuccess("Skills re-extracted from the description.");
                  },
                  onError: (e) => notifyError(e),
                })
              }
            >
              Reset to extracted
            </Button>
          )}
          <Button
            disabled={!changed}
            loading={update.isPending}
            onClick={() =>
              update.mutate(
                { required_skills: required, preferred_skills: preferred },
                {
                  onSuccess: (j) => {
                    sync(j);
                    notifySuccess("Skills updated. Re-run analyses to apply them.");
                  },
                  onError: (e) => notifyError(e, "Could not save skills"),
                },
              )
            }
          >
            Save skills
          </Button>
        </Group>
      </Stack>
    </SectionCard>
  );
}
