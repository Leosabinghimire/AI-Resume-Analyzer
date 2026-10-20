"use client";

import { Alert, Anchor, Text } from "@mantine/core";
import { IconLock, IconShieldCheck } from "@tabler/icons-react";
import Link from "next/link";
import { useAIConfig } from "@/features/auth/api";
import { ApiError } from "@/lib/api-client";

/** Explains, before any AI request, where resume content will go. */
export function AIDisclosure() {
  const config = useAIConfig();
  if (!config.data) return null;
  if (config.data.is_mock) {
    return (
      <Text size="xs" c="dimmed">
        No AI provider is configured, so results come from local rules and are labeled as demo output. Nothing leaves
        the server.
      </Text>
    );
  }
  if (config.data.requires_consent) return <ConsentRequiredAlert />;
  return (
    <Text size="xs" c="dimmed">
      <IconShieldCheck size={12} style={{ verticalAlign: "middle" }} /> A redacted copy of this resume (no name, email,
      phone or links) will be sent to {config.data.provider} ({config.data.model}).
    </Text>
  );
}

export function ConsentRequiredAlert() {
  return (
    <Alert color="yellow" variant="light" icon={<IconLock size={18} />} title="AI processing is turned off">
      AI features send a redacted copy of your resume to an external AI provider. You can enable this in{" "}
      <Anchor component={Link} href="/settings#ai">
        Settings
      </Anchor>
      . Match scores and parsing keep working without it.
    </Alert>
  );
}

export function isConsentError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "ai_consent_required";
}
