import { Anchor, Breadcrumbs, Group, Stack, Text, Title } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";

export interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  /** Small elements shown under the title, e.g. status badges. */
  meta?: ReactNode;
}

export function PageHeader({ title, description, actions, breadcrumbs, meta }: PageHeaderProps) {
  return (
    <Stack gap="sm" mb="xl">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs separator={<IconChevronRight size={14} />} separatorMargin={4}>
          {breadcrumbs.map((crumb) =>
            crumb.href ? (
              <Anchor key={crumb.label} component={Link} href={crumb.href} size="sm" c="dimmed">
                {crumb.label}
              </Anchor>
            ) : (
              <Text key={crumb.label} size="sm" fw={500} truncate maw={320}>
                {crumb.label}
              </Text>
            ),
          )}
        </Breadcrumbs>
      )}
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <Stack gap={6} style={{ flex: 1, minWidth: 260 }}>
          <Title order={1} fz={{ base: 24, sm: 28 }} lh={1.2} style={{ letterSpacing: "-0.015em" }}>
            {title}
          </Title>
          {description && (
            <Text c="dimmed" size="sm" maw={760}>
              {description}
            </Text>
          )}
          {meta && <Group gap="xs">{meta}</Group>}
        </Stack>
        {actions && (
          <Group gap="sm" wrap="wrap">
            {actions}
          </Group>
        )}
      </Group>
    </Stack>
  );
}
