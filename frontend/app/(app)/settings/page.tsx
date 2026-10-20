"use client";

import { Box, Grid, NavLink, Stack } from "@mantine/core";
import { LoadingBlock, PageHeader } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import {
  AIConsentSection,
  AppearanceSection,
  DeleteAccountSection,
  PasswordSection,
  ProfileSection,
} from "@/features/settings/SettingsSections";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "ai", label: "AI processing" },
  { id: "security", label: "Password" },
  { id: "appearance", label: "Appearance" },
  { id: "danger", label: "Delete account" },
];

export default function SettingsPage() {
  const me = useMe();
  if (!me.data) return <LoadingBlock rows={3} />;
  return (
    <>
      <PageHeader title="Account settings" description="Manage your profile, privacy preferences and security." />
      <Grid gutter="xl">
        <Grid.Col span={{ base: 12, md: 3 }} visibleFrom="md">
          <Box pos="sticky" top={88} component="nav" aria-label="Settings sections">
            {SECTIONS.map((s) => (
              <NavLink key={s.id} href={`#${s.id}`} label={s.label} style={{ borderRadius: "var(--mantine-radius-md)" }} />
            ))}
          </Box>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 9 }}>
          <Stack gap="lg" maw={760}>
            <ProfileSection user={me.data} />
            <AIConsentSection user={me.data} />
            <PasswordSection />
            <AppearanceSection />
            <DeleteAccountSection />
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}
