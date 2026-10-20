import { Anchor, Breadcrumbs, Group, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";
import type { ReactNode } from "react";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
}

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <Stack gap="xs" mb="lg">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs separatorMargin={6} fz="sm">
          {breadcrumbs.map((crumb) =>
            crumb.href ? (
              <Anchor key={crumb.label} component={Link} href={crumb.href} size="sm">
                {crumb.label}
              </Anchor>
            ) : (
              <Text key={crumb.label} size="sm" c="dimmed">
                {crumb.label}
              </Text>
            ),
          )}
        </Breadcrumbs>
      )}
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <Stack gap={4} style={{ flex: 1, minWidth: 240 }}>
          <Title order={2} fz={{ base: 22, sm: 26 }}>
            {title}
          </Title>
          {description && (
            <Text c="dimmed" size="sm" maw={720}>
              {description}
            </Text>
          )}
        </Stack>
        {actions && <Group gap="sm">{actions}</Group>}
      </Group>
    </Stack>
  );
}
