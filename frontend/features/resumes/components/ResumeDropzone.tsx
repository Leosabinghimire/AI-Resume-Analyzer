"use client";

import { Group, Stack, Text } from "@mantine/core";
import { Dropzone, MIME_TYPES, type FileRejection } from "@mantine/dropzone";
import { IconFileUpload, IconUpload, IconX } from "@tabler/icons-react";

export const MAX_UPLOAD_MB = 5;
export const ACCEPTED_TYPES = [MIME_TYPES.pdf, MIME_TYPES.docx];

/** Turns dropzone rejections into a single user-facing message. */
export function rejectionMessage(rejections: FileRejection[]): string {
  const code = rejections[0]?.errors[0]?.code;
  if (code === "file-too-large") return `The file is larger than ${MAX_UPLOAD_MB} MB.`;
  if (code === "file-invalid-type") return "Only PDF and DOCX files are supported.";
  if (code === "too-many-files") return "Please upload one file at a time.";
  return "This file cannot be uploaded.";
}

interface Props {
  onFile: (file: File) => void;
  onReject: (message: string) => void;
  loading: boolean;
}

export function ResumeDropzone({ onFile, onReject, loading }: Props) {
  return (
    <Dropzone
      onDrop={(files) => files[0] && onFile(files[0])}
      onReject={(rejections) => onReject(rejectionMessage(rejections))}
      maxSize={MAX_UPLOAD_MB * 1024 * 1024}
      accept={ACCEPTED_TYPES}
      multiple={false}
      loading={loading}
      aria-label="Upload resume file"
    >
      <Group justify="center" gap="xl" mih={180} style={{ pointerEvents: "none" }}>
        <Dropzone.Accept>
          <IconUpload size={48} stroke={1.4} />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconX size={48} stroke={1.4} />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconFileUpload size={48} stroke={1.4} />
        </Dropzone.Idle>
        <Stack gap={4}>
          <Text size="lg" fw={500}>
            Drag your resume here or click to browse
          </Text>
          <Text size="sm" c="dimmed">
            PDF or DOCX, up to {MAX_UPLOAD_MB} MB and 10 pages. Scanned image-only PDFs are not supported.
          </Text>
        </Stack>
      </Group>
    </Dropzone>
  );
}
