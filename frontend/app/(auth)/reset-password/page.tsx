"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Anchor, Button, PasswordInput, Stack } from "@mantine/core";
import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/ui";
import { useConfirmPasswordReset } from "@/features/auth/api";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { resetPasswordSchema, type ResetPasswordValues } from "@/features/auth/schemas";

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
      <Alert color="red" icon={<IconAlertCircle size={18} />}>
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
      <Alert color="teal" icon={<IconCircleCheck size={18} />}>
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
        <FormAlert error={confirm.error} />
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
        <Button type="submit" size="md" loading={confirm.isPending} fullWidth>
          Set new password
        </Button>
      </Stack>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password" subtitle="Resetting your password signs you out of all other sessions.">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
