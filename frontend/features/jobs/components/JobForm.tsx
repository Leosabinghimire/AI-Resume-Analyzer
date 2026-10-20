"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Anchor, Button, Group, SimpleGrid, Stack, Textarea, TextInput } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { ApiError, errorMessage } from "@/lib/api-client";
import { jobSchema, toJobInput, type JobFormValues } from "../schemas";

interface Props {
  defaultValues?: Partial<JobFormValues>;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (input: ReturnType<typeof toJobInput>) => void;
  onCancel?: () => void;
}

export function JobForm({ defaultValues, submitLabel, pending, error, onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: { title: "", company: "", url: "", description: "", ...defaultValues },
  });
  const length = watch("description").length;
  const duplicateId =
    error instanceof ApiError && error.code === "duplicate_job"
      ? (error.details as { job_id?: string } | undefined)?.job_id
      : undefined;
  const serverFieldErrors = error instanceof ApiError ? error.fieldErrors() : {};

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(toJobInput(values)))} noValidate aria-label="Job description form">
      <Stack gap="md">
        {Boolean(error) && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert">
            {errorMessage(error)}{" "}
            {duplicateId && (
              <Anchor component={Link} href={`/jobs/${duplicateId}`}>
                Open the saved job
              </Anchor>
            )}
          </Alert>
        )}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput label="Job title" required error={errors.title?.message ?? serverFieldErrors.title} {...register("title")} />
          <TextInput label="Company" error={errors.company?.message} {...register("company")} />
        </SimpleGrid>
        <TextInput
          label="Job posting URL"
          placeholder="https://"
          error={errors.url?.message ?? serverFieldErrors.url}
          {...register("url")}
        />
        <Textarea
          label="Job description"
          description="Paste the complete posting, including responsibilities and requirements. Section headings help detection."
          required
          autosize
          minRows={10}
          maxRows={24}
          error={errors.description?.message ?? serverFieldErrors.description}
          {...register("description")}
        />
        <Group justify="space-between">
          <span style={{ fontSize: 12, color: "var(--mantine-color-dimmed)" }}>{length.toLocaleString()} / 30,000</span>
          <Group>
            {onCancel && (
              <Button variant="default" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" loading={pending}>
              {submitLabel}
            </Button>
          </Group>
        </Group>
      </Stack>
    </form>
  );
}
