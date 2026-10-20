import { Card, Text, ThemeIcon } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface FeatureCardProps {
  icon: Icon;
  title: string;
  children: ReactNode;
}

export function FeatureCard({ icon: IconComponent, title, children }: FeatureCardProps) {
  return (
    <Card padding="xl" h="100%">
      <ThemeIcon variant="light" size={46} radius="md" mb="md">
        <IconComponent size={24} stroke={1.7} />
      </ThemeIcon>
      <Text fw={650} size="lg" mb={6}>
        {title}
      </Text>
      <Text size="sm" c="dimmed" lh={1.6}>
        {children}
      </Text>
    </Card>
  );
}
