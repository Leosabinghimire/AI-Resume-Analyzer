"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Anchor, Button, Paper, PasswordInput, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { useConfirmPasswordReset } from "@/features/auth/api";
import { resetPasswordSchema, type ResetPasswordValues } from "@/features/auth/schemas";
import { errorMessage } from "@/lib/api-client";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const confirm = useConfirmPasswordReset();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  if (!token) {
    return (
      <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />}>
        This reset link is incomplete. Request a new link from the{" "}
        <Anchor component={Link} href="/forgot-password">
          password reset page
        </Anchor>
        .
      </Alert>
    );
  }

  if (confirm.isSuccess) {
    return (
      <Alert color="teal" variant="light" icon={<IconCircleCheck size={18} />}>
        {confirm.data.message}{" "}
        <Anchor component={Link} href="/login">
          Sign in
        </Anchor>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(({ new_password }) => confirm.mutate({ token, new_password }))} noValidate>
      <Stack gap="md">
        {confirm.error && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert">
            {errorMessage(confirm.error)}
          </Alert>
        )}
        <PasswordInput
          label="New password"
          description="At least 8 characters, with a letter and a number."
          autoComplete="new-password"
          required
          error={errors.new_password?.message}
          {...register("new_password")}
        />
        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          required
          error={errors.confirm_password?.message}
          {...register("confirm_password")}
        />
        <Button type="submit" loading={confirm.isPending} fullWidth>
          Set new password
        </Button>
      </Stack>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Paper withBorder shadow="sm" p={{ base: "lg", sm: "xl" }}>
      <Stack gap="md">
        <div>
          <Title order={2} fz={24}>
            Choose a new password
          </Title>
          <Text c="dimmed" size="sm">
            Resetting your password signs you out of all other sessions.
          </Text>
        </div>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </Stack>
    </Paper>
  );
}
