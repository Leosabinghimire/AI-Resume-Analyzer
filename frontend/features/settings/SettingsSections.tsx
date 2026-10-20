"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  PasswordInput,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconKey, IconPalette, IconRobot, IconTrash, IconUser } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BulletList, FormAlert, SectionCard } from "@/components/ui";
import { useAIConfig, useChangePassword, useDeleteAccount, useUpdateProfile } from "@/features/auth/api";
import { changePasswordSchema, type ChangePasswordValues } from "@/features/auth/schemas";
import { formatDateTime } from "@/lib/format";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { User } from "@/types/api";

export function ProfileSection({ user }: { user: User }) {
  const update = useUpdateProfile();
  const [name, setName] = useState(user.full_name);
  const trimmed = name.trim();
  return (
    <SectionCard id="profile" title="Profile" icon={<IconUser size={18} />} description="Your name as it appears in the app.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({ full_name: trimmed }, { onSuccess: () => notifySuccess("Profile updated."), onError: (err) => notifyError(err) });
        }}
      >
        <Stack gap="sm">
          <TextInput label="Email" value={user.email} disabled description="Email cannot be changed." />
          <TextInput label="Full name" value={name} onChange={(e) => setName(e.currentTarget.value)} maxLength={120} required />
          <Group justify="flex-end">
            <Button type="submit" loading={update.isPending} disabled={!trimmed || trimmed === user.full_name}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </SectionCard>
  );
}

export function AIConsentSection({ user }: { user: User }) {
  const config = useAIConfig();
  const update = useUpdateProfile();
  return (
    <SectionCard
      id="ai"
      title="AI processing"
      icon={<IconRobot size={18} />}
      description="AI feedback, semantic insights and interview preparation use an external provider when one is configured."
      actions={
        config.data && (
          <Badge variant="light" color={config.data.is_mock ? "orange" : "violet"}>
            {config.data.is_mock ? "Demo mode · no AI provider" : `${config.data.provider} · ${config.data.model}`}
          </Badge>
        )
      }
    >
      <Stack gap="md">
        <BulletList
          variant="check"
          items={[
            "Your name, email, phone number and links are removed before anything is sent.",
            "The job description is included so suggestions can be tailored.",
            "Parsing and match scores never use AI and work without consent.",
          ]}
        />
        <Switch
          checked={user.ai_processing_consent}
          disabled={update.isPending}
          onChange={(e) =>
            update.mutate(
              { ai_processing_consent: e.currentTarget.checked },
              {
                onSuccess: (u) => notifySuccess(u.ai_processing_consent ? "AI processing enabled." : "AI processing disabled."),
                onError: (err) => notifyError(err),
              },
            )
          }
          label="Allow sending redacted resume content to the AI provider"
          description={user.ai_consent_at ? `Enabled on ${formatDateTime(user.ai_consent_at)}` : "Currently disabled"}
        />
      </Stack>
    </SectionCard>
  );
}

export function PasswordSection() {
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });
  return (
    <SectionCard id="security" title="Change password" icon={<IconKey size={18} />} description="Changing your password signs you out on all other devices.">
      <form
        noValidate
        onSubmit={handleSubmit(({ current_password, new_password }) =>
          change.mutate(
            { current_password, new_password },
            {
              onSuccess: () => {
                reset();
                notifySuccess("Password changed.");
              },
            },
          ),
        )}
      >
        <Stack gap="sm">
          <FormAlert error={change.error} />
          <PasswordInput label="Current password" autoComplete="current-password" error={errors.current_password?.message} {...register("current_password")} />
          <PasswordInput label="New password" autoComplete="new-password" error={errors.new_password?.message} {...register("new_password")} />
          <PasswordInput label="Confirm new password" autoComplete="new-password" error={errors.confirm_password?.message} {...register("confirm_password")} />
          <Group justify="flex-end">
            <Button type="submit" loading={change.isPending}>
              Change password
            </Button>
          </Group>
        </Stack>
      </form>
    </SectionCard>
  );
}

export function AppearanceSection() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  return (
    <SectionCard id="appearance" title="Appearance" icon={<IconPalette size={18} />} description="Choose a theme or follow your system setting.">
      <SegmentedControl
        value={colorScheme}
        onChange={(v) => setColorScheme(v as "light" | "dark" | "auto")}
        data={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "auto", label: "System" },
        ]}
        aria-label="Color theme"
      />
    </SectionCard>
  );
}

export function DeleteAccountSection() {
  const router = useRouter();
  const remove = useDeleteAccount();
  const [opened, modal] = useDisclosure(false);
  const [password, setPassword] = useState("");
  return (
    <SectionCard
      id="danger"
      tone="danger"
      title="Delete account"
      icon={<IconTrash size={18} />}
      description="Permanently deletes your account, uploaded files, resume versions, jobs, analyses, feedback and interview preparation."
    >
      <Button color="red" variant="light" onClick={modal.open}>
        Delete my account and data
      </Button>
      <Modal opened={opened} onClose={modal.close} title="Delete account permanently?">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            remove.mutate(password, { onSuccess: () => router.replace("/?deleted=1") });
          }}
        >
          <Stack>
            <Alert color="red" icon={<IconAlertTriangle size={18} />}>
              All of your data will be removed immediately. This cannot be undone.
            </Alert>
            <FormAlert error={remove.error} />
            <PasswordInput
              label="Confirm with your password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              autoComplete="current-password"
              required
              data-autofocus
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={modal.close}>
                Cancel
              </Button>
              <Button type="submit" color="red" loading={remove.isPending} disabled={!password}>
                Delete everything
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <Text size="xs" c="dimmed" mt="sm">
        Data already sent to an external AI provider is subject to that provider&apos;s retention policy.
      </Text>
    </SectionCard>
  );
}
