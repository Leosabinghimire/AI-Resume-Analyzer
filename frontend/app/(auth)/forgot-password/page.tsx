"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Anchor, Button, Stack, TextInput } from "@mantine/core";
import { IconMailCheck } from "@tabler/icons-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/ui";
import { useRequestPasswordReset } from "@/features/auth/api";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/features/auth/schemas";

export default function ForgotPasswordPage() {
  const request = useRequestPasswordReset();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your account email and we will send you a reset link."
      footer={
        <Anchor component={Link} href="/login">
          Back to sign in
        </Anchor>
      }
    >
      {request.isSuccess ? (
        <Alert color="teal" icon={<IconMailCheck size={18} />}>
          {request.data.message} The link expires in 30 minutes.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit(({ email }) => request.mutate(email))} noValidate>
          <Stack gap="md">
            <FormAlert error={request.error} />
            <TextInput label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register("email")} />
            <Button type="submit" size="md" loading={request.isPending} fullWidth>
              Send reset link
            </Button>
          </Stack>
        </form>
      )}
    </AuthCard>
  );
}
