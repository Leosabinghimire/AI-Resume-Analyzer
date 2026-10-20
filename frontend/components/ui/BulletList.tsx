import { List, ListItem, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconPoint } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface BulletListProps {
  items: ReactNode[];
  empty?: string;
  variant?: "dot" | "check" | "ordered";
  size?: "xs" | "sm" | "md";
}

/** Consistent bulleted list for feedback, requirements and outlines. */
export function BulletList({ items, empty = "None.", variant = "dot", size = "sm" }: BulletListProps) {
  if (items.length === 0) {
    return (
      <Text size={size} c="dimmed">
        {empty}
      </Text>
    );
  }
  const icon =
    variant === "check" ? (
      <ThemeIcon size={18} radius="xl" color="teal" variant="light">
        <IconCheck size={12} />
      </ThemeIcon>
    ) : variant === "dot" ? (
      <IconPoint size={16} style={{ color: "var(--mantine-color-dimmed)", marginTop: 3 }} />
    ) : undefined;
  return (
    <List
      size={size}
      spacing={6}
      type={variant === "ordered" ? "ordered" : "unordered"}
      icon={icon}
      styles={{ itemWrapper: { alignItems: "flex-start" } }}
    >
      {items.map((item, i) => (
        <ListItem key={i}>{item}</ListItem>
      ))}
    </List>
  );
}
