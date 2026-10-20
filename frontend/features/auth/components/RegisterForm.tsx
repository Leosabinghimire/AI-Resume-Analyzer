"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Anchor, Button, PasswordInput, Stack, TextInput } from "@mantine/core";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/ui";
import { ApiError } from "@/lib/api-client";
import { useRegister } from "../api";
import { registerSchema, type RegisterValues } from "../schemas";
import { AuthCard } from "./AuthCard";

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
  // A taken email is shown on the field itself, so it does not also need a banner.
  const bannerError =
    registerUser.error instanceof ApiError && registerUser.error.code === "email_taken" ? null : registerUser.error;

  return (
    <AuthCard
      title="Create your account"
      subtitle="Analyze resumes against real job descriptions in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Anchor component={Link} href="/login" fw={600}>
            Sign in
          </Anchor>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate aria-label="Create account form">
        <Stack gap="md">
          <FormAlert error={bannerError} />
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
          <Button type="submit" fullWidth size="md" loading={registerUser.isPending}>
            Create account
          </Button>
        </Stack>
      </form>
    </AuthCard>
  );
}
