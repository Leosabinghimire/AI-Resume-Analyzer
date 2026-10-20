import { Paper, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Shared frame for sign-in, registration and password-reset screens. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <Stack gap="lg">
      <Paper withBorder shadow="sm" p={{ base: "lg", sm: 32 }} radius="lg" bg="var(--app-surface)">
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={2} fz={26} style={{ letterSpacing: "-0.015em" }}>
              {title}
            </Title>
            <Text c="dimmed" size="sm">
              {subtitle}
            </Text>
          </Stack>
          {children}
        </Stack>
      </Paper>
      {footer && (
        <Text size="sm" ta="center" c="dimmed">
          {footer}
        </Text>
      )}
    </Stack>
  );
}
