"use client";

import { Alert, Button, Card, Code, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { IconDownload, IconRefresh } from "@tabler/icons-react";
import { ErrorBlock, LoadingBlock } from "@/components/common/QueryState";
import { notifyError, notifySuccess } from "@/lib/notify";
import { originalFileUrl, useReparseResume, useResumeText } from "../api";

export function OriginalTextPanel({ resumeId, onReparsed }: { resumeId: string; onReparsed: (versionId: string) => void }) {
  const text = useResumeText(resumeId, true);
  const reparse = useReparseResume(resumeId);
  return (
    <Stack gap="md">
      <Alert color="gray" variant="light">
        This is the text extracted when you uploaded the file. It is never modified. If parsing put content in the wrong
        section, fix it in the editor or re-parse into a new version.
      </Alert>
      <Group>
        <Button component="a" href={originalFileUrl(resumeId)} variant="default" leftSection={<IconDownload size={16} />}>
          Download original file
        </Button>
        <Button
          variant="light"
          leftSection={<IconRefresh size={16} />}
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
          Re-parse into new version
        </Button>
      </Group>
      {text.isPending && <LoadingBlock rows={1} height={240} />}
      {text.error && <ErrorBlock error={text.error} onRetry={() => text.refetch()} />}
      {text.data && (
        <Card p={0}>
          <ScrollArea h={480}>
            <Code block style={{ whiteSpace: "pre-wrap", background: "transparent" }}>
              {text.data.raw_text}
            </Code>
          </ScrollArea>
        </Card>
      )}
      <Text size="xs" c="dimmed">
        Only the extracted text is shown; formatting, images and layout from the original file are not reproduced.
      </Text>
    </Stack>
  );
}
