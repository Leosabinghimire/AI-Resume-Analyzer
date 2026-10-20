import { Badge, Box, Container, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface SectionProps {
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  muted?: boolean;
  id?: string;
  align?: "center" | "left";
}

/** Vertical rhythm for marketing pages: optional eyebrow, heading and intro above the content. */
export function Section({ eyebrow, title, subtitle, children, muted, id, align = "center" }: SectionProps) {
  const centered = align === "center";
  return (
    <Box
      component="section"
      id={id}
      py={{ base: 56, md: 88 }}
      bg={muted ? "var(--app-surface-muted)" : undefined}
      style={muted ? { borderBlock: "1px solid var(--app-border)" } : undefined}
    >
      <Container size="lg">
        {(eyebrow || title || subtitle) && (
          <Stack gap="sm" mb={48} align={centered ? "center" : "flex-start"} ta={centered ? "center" : "left"}>
            {eyebrow && (
              <Badge variant="light" size="lg">
                {eyebrow}
              </Badge>
            )}
            {title && (
              <Title order={2} fz={{ base: 28, md: 36 }} style={{ letterSpacing: "-0.02em" }} maw={720}>
                {title}
              </Title>
            )}
            {subtitle && (
              <Text c="dimmed" size="lg" maw={640}>
                {subtitle}
              </Text>
            )}
          </Stack>
        )}
        {children}
      </Container>
    </Box>
  );
}
