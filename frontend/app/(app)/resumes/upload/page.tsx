"use client";

import { Alert, Anchor, Button, Card, Group, List, Stack, Text, TextInput } from "@mantine/core";
import { IconAlertCircle, IconFileText, IconLock, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { useUploadResume } from "@/features/resumes/api";
import { ResumeDropzone } from "@/features/resumes/components/ResumeDropzone";
import { ApiError, errorMessage } from "@/lib/api-client";
import { formatFileSize } from "@/lib/format";
import { notifySuccess } from "@/lib/notify";

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
      <Card maw={760}>
        <Stack gap="md">
          {!file ? (
            <ResumeDropzone
              loading={false}
              onFile={(f) => {
                setClientError(null);
                upload.reset();
                setFile(f);
                setTitle(f.name.replace(/\.(pdf|docx)$/i, ""));
              }}
              onReject={setClientError}
            />
          ) : (
            <Group justify="space-between" p="md" style={{ border: "1px solid var(--mantine-color-default-border)", borderRadius: 8 }}>
              <Group gap="sm">
                <IconFileText size={28} stroke={1.4} aria-hidden />
                <div>
                  <Text fw={500}>{file.name}</Text>
                  <Text size="xs" c="dimmed">
                    {formatFileSize(file.size)}
                  </Text>
                </div>
              </Group>
              <Button
                variant="subtle"
                color="gray"
                leftSection={<IconX size={16} />}
                onClick={() => {
                  setFile(null);
                  upload.reset();
                }}
                disabled={upload.isPending}
              >
                Choose another file
              </Button>
            </Group>
          )}

          {clientError && (
            <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert">
              {clientError}
            </Alert>
          )}
          {upload.error && (
            <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert" title="Upload failed">
              {errorMessage(upload.error)}{" "}
              {duplicateId && (
                <Anchor component={Link} href={`/resumes/${duplicateId}`}>
                  Open the existing resume
                </Anchor>
              )}
            </Alert>
          )}

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
          <Alert color="gray" variant="light" icon={<IconLock size={18} />} title="How your file is handled">
            <List size="sm" spacing={2}>
              <List.Item>The file is checked by content type and size, then stored privately in your account.</List.Item>
              <List.Item>Parsing runs on the server without AI. Nothing is sent to an external provider.</List.Item>
              <List.Item>You can delete the file and all derived data at any time.</List.Item>
            </List>
          </Alert>
        </Stack>
      </Card>
    </>
  );
}
