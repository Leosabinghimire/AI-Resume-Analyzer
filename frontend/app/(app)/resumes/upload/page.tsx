"use client";

import { Alert, Anchor, Button, Grid, Group, Paper, Stack, Text, TextInput, ThemeIcon } from "@mantine/core";
import { IconAlertCircle, IconFileText, IconLock, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BulletList, FormAlert, PageHeader, SectionCard } from "@/components/ui";
import { useUploadResume } from "@/features/resumes/api";
import { ResumeDropzone } from "@/features/resumes/components/ResumeDropzone";
import { ApiError } from "@/lib/api-client";
import { formatFileSize } from "@/lib/format";
import { notifySuccess } from "@/lib/notify";

function SelectedFile({ file, onClear, disabled }: { file: File; onClear: () => void; disabled: boolean }) {
  return (
    <Paper withBorder p="md" radius="lg" bg="var(--app-surface-muted)">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
          <ThemeIcon size={44} radius="md" variant="light">
            <IconFileText size={24} stroke={1.6} />
          </ThemeIcon>
          <div style={{ minWidth: 0 }}>
            <Text fw={600} truncate>
              {file.name}
            </Text>
            <Text size="xs" c="dimmed">
              {formatFileSize(file.size)}
            </Text>
          </div>
        </Group>
        <Button variant="subtle" color="gray" leftSection={<IconX size={16} />} onClick={onClear} disabled={disabled}>
          Choose another file
        </Button>
      </Group>
    </Paper>
  );
}

export default function UploadResumePage() {
  const router = useRouter();
  const upload = useUploadResume();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const duplicateId =
    upload.error instanceof ApiError && upload.error.code === "duplicate_resume"
      ? (upload.error.details as { resume_id?: string } | undefined)?.resume_id
      : undefined;

  const choose = (f: File) => {
    setClientError(null);
    upload.reset();
    setFile(f);
    setTitle(f.name.replace(/\.(pdf|docx)$/i, ""));
  };

  const submit = () => {
    if (!file) return;
    upload.mutate(
      { file, title: title.trim() || undefined },
      {
        onSuccess: (result) => {
          notifySuccess("Resume uploaded and parsed. Review the extracted details.");
          router.push(`/resumes/${result.resume.id}?uploaded=1`);
        },
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Upload a resume"
        description="Text is extracted and organized into sections on the server. You can review and correct everything next."
        breadcrumbs={[{ label: "Resumes", href: "/resumes" }, { label: "Upload" }]}
      />
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <SectionCard>
            <Stack gap="lg">
              {file ? (
                <SelectedFile
                  file={file}
                  disabled={upload.isPending}
                  onClear={() => {
                    setFile(null);
                    upload.reset();
                  }}
                />
              ) : (
                <ResumeDropzone loading={false} onFile={choose} onReject={setClientError} />
              )}
              {clientError && (
                <Alert color="red" icon={<IconAlertCircle size={18} />} role="alert">
                  {clientError}
                </Alert>
              )}
              <FormAlert error={upload.error} title="Upload failed">
                {duplicateId && (
                  <Anchor component={Link} href={`/resumes/${duplicateId}`}>
                    Open the existing resume
                  </Anchor>
                )}
              </FormAlert>
              <TextInput
                label="Title"
                description="How this resume appears in your library."
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                maxLength={150}
                disabled={!file}
              />
              <Group justify="flex-end">
                <Button component={Link} href="/resumes" variant="default">
                  Cancel
                </Button>
                <Button onClick={submit} disabled={!file} loading={upload.isPending}>
                  Upload and parse
                </Button>
              </Group>
            </Stack>
          </SectionCard>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="lg">
            <SectionCard title="How your file is handled" icon={<IconLock size={18} />}>
              <BulletList
                variant="check"
                items={[
                  "Checked by content type and size, then stored privately in your account.",
                  "Parsed on the server without AI. Nothing goes to an external provider.",
                  "Delete the file and everything derived from it at any time.",
                ]}
              />
            </SectionCard>
            <SectionCard title="Tips for best results">
              <BulletList
                items={[
                  "Use a text-based PDF or DOCX; scanned images cannot be read.",
                  "Clear headings like Experience, Education and Skills improve detection.",
                  "Single-column layouts parse more reliably than tables or columns.",
                ]}
              />
            </SectionCard>
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}
