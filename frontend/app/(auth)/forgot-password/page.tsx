"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Anchor, Button, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconAlertCircle, IconMailCheck } from "@tabler/icons-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useRequestPasswordReset } from "@/features/auth/api";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/features/auth/schemas";
import { errorMessage } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const request = useRequestPasswordReset();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  return (
    <Paper withBorder shadow="sm" p={{ base: "lg", sm: "xl" }}>
      <Stack gap="md">
        <div>
          <Title order={2} fz={24}>
            Reset your password
          </Title>
          <Text c="dimmed" size="sm">
            Enter your account email and we will send you a reset link.
          </Text>
        </div>
        {request.isSuccess ? (
          <Alert color="teal" variant="light" icon={<IconMailCheck size={18} />}>
            {request.data.message} The link expires in 30 minutes.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit(({ email }) => request.mutate(email))} noValidate>
            <Stack gap="md">
              {request.error && (
                <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert">
                  {errorMessage(request.error)}
                </Alert>
              )}
              <TextInput label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register("email")} />
              <Button type="submit" loading={request.isPending} fullWidth>
                Send reset link
              </Button>
            </Stack>
          </form>
        )}
        <Anchor component={Link} href="/login" size="sm" ta="center">
          Back to sign in
        </Anchor>
      </Stack>
    </Paper>
  );
}
