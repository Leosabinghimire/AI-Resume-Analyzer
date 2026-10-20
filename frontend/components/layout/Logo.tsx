import { Group, Text, ThemeIcon } from "@mantine/core";
import { IconFileAnalytics } from "@tabler/icons-react";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }} aria-label="AI Resume Analyzer home">
      <Group gap={8} wrap="nowrap">
        <ThemeIcon size={30} radius="md" variant="filled">
          <IconFileAnalytics size={18} />
        </ThemeIcon>
        <Text fw={700} size="md" style={{ whiteSpace: "nowrap" }}>
          AI Resume Analyzer
        </Text>
      </Group>
    </Link>
  );
}
