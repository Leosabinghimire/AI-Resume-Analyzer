import { Box, Card, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Remove body padding, e.g. for edge-to-edge tables. The header keeps its padding. */
  flush?: boolean;
  id?: string;
  tone?: "default" | "danger";
}

/** The standard content container: optional header (icon, title, description, actions) plus body. */
export function SectionCard({ title, description, icon, actions, children, flush, id, tone = "default" }: SectionCardProps) {
  const hasHeader = Boolean(title || actions);
  return (
    <Card
      id={id}
      padding={0}
      style={tone === "danger" ? { borderColor: "var(--mantine-color-red-filled)" } : undefined}
    >
      {hasHeader && (
        <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap" px="lg" pt="lg" pb={flush ? "md" : 0}>
          <Group gap="sm" align="flex-start" wrap="nowrap" style={{ minWidth: 0 }}>
            {icon && (
              <ThemeIcon variant="light" size={34} radius="md" color={tone === "danger" ? "red" : undefined}>
                {icon}
              </ThemeIcon>
            )}
            <Stack gap={2} style={{ minWidth: 0 }}>
              {title && (
                <Title order={4} c={tone === "danger" ? "red" : undefined}>
                  {title}
                </Title>
              )}
              {description &&
                (typeof description === "string" ? (
                  <Text size="sm" c="dimmed">
                    {description}
                  </Text>
                ) : (
                  <Box>{description}</Box>
                ))}
            </Stack>
          </Group>
          {actions && (
            <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
              {actions}
            </Group>
          )}
        </Group>
      )}
      <Box p={flush ? 0 : "lg"} pt={hasHeader && !flush ? "md" : undefined}>
        {children}
      </Box>
    </Card>
  );
}
