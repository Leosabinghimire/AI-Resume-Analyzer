"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Anchor, Button, Group, PasswordInput, Stack, TextInput } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/ui";
import { useLogin } from "../api";
import { loginSchema, type LoginValues } from "../schemas";
import { AuthCard } from "./AuthCard";

interface LoginFormProps {
  onSuccess: () => void;
  sessionExpired?: boolean;
}

export function LoginForm({ onSuccess, sessionExpired = false }: LoginFormProps) {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue to your workspace."
      footer={
        <>
          No account yet?{" "}
          <Anchor component={Link} href="/register" fw={600}>
            Create one
          </Anchor>
        </>
      }
    >
      <form onSubmit={handleSubmit((values) => login.mutate(values, { onSuccess }))} noValidate aria-label="Sign in form">
        <Stack gap="md">
          {sessionExpired && !login.error && (
            <Alert color="yellow" icon={<IconClock size={18} />}>
              Your session expired. Please sign in again.
            </Alert>
          )}
          <FormAlert error={login.error} />
          <TextInput label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register("email")} />
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...register("password")}
          />
          <Group justify="flex-end" mt={-6}>
            <Anchor component={Link} href="/forgot-password" size="sm">
              Forgot password?
            </Anchor>
          </Group>
          <Button type="submit" fullWidth size="md" loading={login.isPending}>
            Sign in
          </Button>
        </Stack>
      </form>
    </AuthCard>
  );
}
