import { Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconFileAnalytics } from "@tabler/icons-react";
import Link from "next/link";

export function Logo({ href = "/", withTagline = false }: { href?: string; withTagline?: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }} aria-label="AI Resume Analyzer home">
      <Group gap={10} wrap="nowrap">
        <ThemeIcon size={34} radius="md" variant="gradient" gradient={{ from: "brand.5", to: "brand.8", deg: 135 }}>
          <IconFileAnalytics size={20} />
        </ThemeIcon>
        <Stack gap={0}>
          <Text fw={700} size="md" lh={1.2} style={{ whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
            AI Resume Analyzer
          </Text>
          {withTagline && (
            <Text size="xs" c="dimmed" lh={1.2}>
              & Job Matcher
            </Text>
          )}
        </Stack>
      </Group>
    </Link>
  );
}
