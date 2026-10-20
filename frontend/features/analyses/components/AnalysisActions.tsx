"use client";

import { Button, Menu } from "@mantine/core";
import { IconChevronDown, IconEdit, IconHistory, IconMessageQuestion, IconRefresh, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGenerateInterviewPrep } from "@/features/coaching/api";
import { isConsentError } from "@/features/coaching/components/AIAccessNotice";
import { confirmAction, notifyError, notifyWarning } from "@/lib/notify";
import type { Analysis } from "@/types/api";
import { useDeleteAnalysis } from "../api";

export function AnalysisActions({ analysis, onRunAgain }: { analysis: Analysis; onRunAgain: () => void }) {
  const router = useRouter();
  const remove = useDeleteAnalysis();
  const prep = useGenerateInterviewPrep();

  return (
    <>
      <Button
        variant="default"
        leftSection={<IconMessageQuestion size={16} />}
        loading={prep.isPending}
        onClick={() =>
          prep.mutate(
            { resume_version_id: analysis.resume.version_id, job_id: analysis.job.id },
            {
              onSuccess: (p) => router.push(`/interview-prep/${p.id}`),
              onError: (e) =>
                isConsentError(e) ? notifyWarning("Enable AI processing in Settings to generate interview prep.") : notifyError(e),
            },
          )
        }
      >
        Interview prep
      </Button>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <Button variant="default" rightSection={<IconChevronDown size={14} />}>
            More
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            component={Link}
            href={`/resumes/${analysis.resume.resume_id}?version=${analysis.resume.version_id}`}
            leftSection={<IconEdit size={16} />}
          >
            Improve this resume
          </Menu.Item>
          <Menu.Item component={Link} href={`/analyses?job_id=${analysis.job.id}`} leftSection={<IconHistory size={16} />}>
            Other analyses for this job
          </Menu.Item>
          <Menu.Item leftSection={<IconRefresh size={16} />} onClick={onRunAgain}>
            Run again
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={() =>
              confirmAction({
                title: "Delete this analysis?",
                message: "The analysis will be removed from your history. Your resume and job are not affected.",
                run: () => remove.mutateAsync(analysis.id),
                successMessage: "Analysis deleted.",
                onSuccess: () => router.replace("/analyses"),
              })
            }
          >
            Delete analysis
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </>
  );
}
