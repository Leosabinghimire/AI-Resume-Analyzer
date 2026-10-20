"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  List,
  Modal,
  PasswordInput,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingBlock } from "@/components/common/QueryState";
import { useAIConfig, useChangePassword, useDeleteAccount, useMe, useUpdateProfile } from "@/features/auth/api";
import { changePasswordSchema, type ChangePasswordValues } from "@/features/auth/schemas";
import { errorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { User } from "@/types/api";

function ProfileCard({ user }: { user: User }) {
  const update = useUpdateProfile();
  const [name, setName] = useState(user.full_name);
  return (
    <Card>
      <Title order={4} mb="md">
        Profile
      </Title>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate(
            { full_name: name.trim() },
            { onSuccess: () => notifySuccess("Profile updated."), onError: (err) => notifyError(err) },
          );
        }}
      >
        <Stack gap="sm">
          <TextInput label="Email" value={user.email} disabled description="Email cannot be changed." />
          <TextInput label="Full name" value={name} onChange={(e) => setName(e.currentTarget.value)} maxLength={120} required />
          <Group justify="flex-end">
            <Button type="submit" loading={update.isPending} disabled={!name.trim() || name.trim() === user.full_name}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}

function AIConsentCard({ user }: { user: User }) {
  const config = useAIConfig();
  const update = useUpdateProfile();
  return (
    <Card id="ai">
      <Group justify="space-between" mb="xs">
        <Title order={4}>AI processing</Title>
        {config.data && (
          <Badge variant="light" color={config.data.is_mock ? "orange" : "violet"} tt="none">
            {config.data.is_mock ? "Demo mode · no AI provider configured" : `${config.data.provider} · ${config.data.model}`}
          </Badge>
        )}
      </Group>
      <Text size="sm" c="dimmed" mb="sm">
        AI feedback, semantic match insights and interview preparation use an external AI provider when one is configured.
      </Text>
      <List size="sm" spacing={4} mb="md">
        <List.Item>Your name, email, phone number and links are removed before anything is sent.</List.Item>
        <List.Item>The job description is included so suggestions can be tailored.</List.Item>
        <List.Item>Parsing and match scores never use AI and work without consent.</List.Item>
      </List>
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
    </Card>
  );
}

function PasswordCard() {
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
    <Card>
      <Title order={4} mb={4}>
        Change password
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Changing your password signs you out on all other devices.
      </Text>
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
          {change.error && (
            <Alert color="red" variant="light" role="alert">
              {errorMessage(change.error)}
            </Alert>
          )}
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
    </Card>
  );
}

function AppearanceCard() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  return (
    <Card>
      <Title order={4} mb="sm">
        Appearance
      </Title>
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
    </Card>
  );
}

function DangerZone() {
  const router = useRouter();
  const remove = useDeleteAccount();
  const [opened, modal] = useDisclosure(false);
  const [password, setPassword] = useState("");
  return (
    <Card style={{ borderColor: "var(--mantine-color-red-6)" }}>
      <Title order={4} c="red" mb={4}>
        Delete account
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Permanently deletes your account, uploaded files, resume versions, job descriptions, analyses, feedback and
        interview preparation. This cannot be undone.
      </Text>
      <Button color="red" variant="light" onClick={modal.open}>
        Delete my account and data
      </Button>
      <Modal opened={opened} onClose={modal.close} title="Delete account permanently?" centered>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            remove.mutate(password, { onSuccess: () => router.replace("/?deleted=1") });
          }}
        >
          <Stack>
            <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
              All of your data will be removed immediately.
            </Alert>
            {remove.error && (
              <Text size="sm" c="red" role="alert">
                {errorMessage(remove.error)}
              </Text>
            )}
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
    </Card>
  );
}

export default function SettingsPage() {
  const me = useMe();
  if (!me.data) return <LoadingBlock rows={3} />;
  return (
    <>
      <PageHeader title="Account settings" description="Manage your profile, privacy preferences and security." />
      <Stack gap="lg" maw={760}>
        <ProfileCard user={me.data} />
        <AIConsentCard user={me.data} />
        <PasswordCard />
        <AppearanceCard />
        <DangerZone />
      </Stack>
    </>
  );
}
