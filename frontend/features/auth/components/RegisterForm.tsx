"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { ApiError, errorMessage } from "@/lib/api-client";
import { useRegister } from "../api";
import { registerSchema, type RegisterValues } from "../schemas";

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: "", email: "", password: "", confirm_password: "" },
  });

  const onSubmit = handleSubmit(({ confirm_password: _, ...values }) =>
    registerUser.mutate(values, {
      onSuccess,
      onError: (error) => {
        if (error instanceof ApiError && error.code === "email_taken") setError("email", { message: error.message });
      },
    }),
  );

  const showBanner = registerUser.error && !(registerUser.error instanceof ApiError && registerUser.error.code === "email_taken");

  return (
    <Paper withBorder shadow="sm" p={{ base: "lg", sm: "xl" }}>
      <form onSubmit={onSubmit} noValidate aria-label="Create account form">
        <Stack gap="md">
          <div>
            <Title order={2} fz={24}>
              Create your account
            </Title>
            <Text c="dimmed" size="sm">
              Analyze resumes against real job descriptions in minutes.
            </Text>
          </div>
          {showBanner && (
            <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert">
              {errorMessage(registerUser.error)}
            </Alert>
          )}
          <TextInput label="Full name" autoComplete="name" required error={errors.full_name?.message} {...register("full_name")} />
          <TextInput label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register("email")} />
          <PasswordInput
            label="Password"
            description="At least 8 characters, with a letter and a number."
            autoComplete="new-password"
            required
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordInput
            label="Confirm password"
            autoComplete="new-password"
            required
            error={errors.confirm_password?.message}
            {...register("confirm_password")}
          />
          <Button type="submit" fullWidth loading={registerUser.isPending}>
            Create account
          </Button>
          <Text size="sm" ta="center">
            Already have an account?{" "}
            <Anchor component={Link} href="/login">
              Sign in
            </Anchor>
          </Text>
        </Stack>
      </form>
    </Paper>
  );
}
