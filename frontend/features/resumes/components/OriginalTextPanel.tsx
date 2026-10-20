"use client";

import { Button, Code, ScrollArea, Text } from "@mantine/core";
import { IconDownload, IconFileText, IconRefresh } from "@tabler/icons-react";
import { LoadingBlock, QueryBoundary, SectionCard } from "@/components/ui";
import { notifyError, notifySuccess } from "@/lib/notify";
import { originalFileUrl, useReparseResume, useResumeText } from "../api";

export function OriginalTextPanel({ resumeId, onReparsed }: { resumeId: string; onReparsed: (versionId: string) => void }) {
  const text = useResumeText(resumeId, true);
  const reparse = useReparseResume(resumeId);
  return (
    <SectionCard
      title="Extracted text"
      icon={<IconFileText size={18} />}
      description="The text extracted at upload. It is never modified; fix parsing mistakes in the editor or re-parse into a new version."
      actions={
        <>
          <Button component="a" href={originalFileUrl(resumeId)} variant="default" size="xs" leftSection={<IconDownload size={14} />}>
            Original file
          </Button>
          <Button
            variant="light"
            size="xs"
            leftSection={<IconRefresh size={14} />}
            loading={reparse.isPending}
            onClick={() =>
              reparse.mutate(undefined, {
                onSuccess: (v) => {
                  notifySuccess(`Created version ${v.version_number} from the original text.`);
                  onReparsed(v.id);
                },
                onError: (e) => notifyError(e, "Re-parse failed"),
              })
            }
          >
            Re-parse
          </Button>
        </>
      }
    >
      <QueryBoundary query={text} loading={<LoadingBlock rows={1} height={240} />}>
        {(data) => (
          <ScrollArea h={480} type="auto" style={{ border: "1px solid var(--app-border)", borderRadius: 8 }}>
            <Code block style={{ whiteSpace: "pre-wrap", background: "var(--app-surface-muted)", minHeight: 478 }}>
              {data.raw_text}
            </Code>
          </ScrollArea>
        )}
      </QueryBoundary>
      <Text size="xs" c="dimmed" mt="sm">
        Formatting, images and layout from the original file are not reproduced here.
      </Text>
    </SectionCard>
  );
}
