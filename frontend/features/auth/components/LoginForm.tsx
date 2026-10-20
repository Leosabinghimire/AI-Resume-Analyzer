"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Anchor, Button, Group, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconAlertCircle, IconClock } from "@tabler/icons-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/lib/api-client";
import { useLogin } from "../api";
import { loginSchema, type LoginValues } from "../schemas";

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

  const onSubmit = handleSubmit((values) => login.mutate(values, { onSuccess }));

  return (
    <Paper withBorder shadow="sm" p={{ base: "lg", sm: "xl" }}>
      <form onSubmit={onSubmit} noValidate aria-label="Sign in form">
        <Stack gap="md">
          <div>
            <Title order={2} fz={24}>
              Welcome back
            </Title>
            <Text c="dimmed" size="sm">
              Sign in to continue to your workspace.
            </Text>
          </div>
          {sessionExpired && !login.error && (
            <Alert color="yellow" variant="light" icon={<IconClock size={18} />}>
              Your session expired. Please sign in again.
            </Alert>
          )}
          {login.error && (
            <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert">
              {errorMessage(login.error)}
            </Alert>
          )}
          <TextInput
            label="Email"
            type="email"
            autoComplete="email"
            required
            error={errors.email?.message}
            {...register("email")}
          />
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...register("password")}
          />
          <Group justify="flex-end">
            <Anchor component={Link} href="/forgot-password" size="sm">
              Forgot password?
            </Anchor>
          </Group>
          <Button type="submit" fullWidth loading={login.isPending}>
            Sign in
          </Button>
          <Text size="sm" ta="center">
            No account yet?{" "}
            <Anchor component={Link} href="/register">
              Create one
            </Anchor>
          </Text>
        </Stack>
      </form>
    </Paper>
  );
}
