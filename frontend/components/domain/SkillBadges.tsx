import { Badge, Group, Text, Tooltip } from "@mantine/core";
import type { MatchedSkill } from "@/types/api";

interface SkillListProps {
  skills: string[];
  color?: string;
  variant?: "light" | "outline" | "filled" | "dot";
  emptyText?: string;
}

export function SkillList({ skills, color = "gray", variant = "light", emptyText = "None" }: SkillListProps) {
  if (skills.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {emptyText}
      </Text>
    );
  }
  return (
    <Group gap={6}>
      {skills.map((s) => (
        <Badge key={s} color={color} variant={variant} tt="none" size="md">
          {s}
        </Badge>
      ))}
    </Group>
  );
}

export function MatchedSkillBadges({ skills }: { skills: MatchedSkill[] }) {
  if (skills.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No matching skills found.
      </Text>
    );
  }
  return (
    <Group gap={6}>
      {skills.map((s) => (
        <Tooltip key={s.skill} label={`Evidence: ${s.evidence.join("; ")}`}>
          <Badge color={s.requirement === "required" ? "teal" : "cyan"} variant="light" tt="none" size="md">
            {s.skill}
          </Badge>
        </Tooltip>
      ))}
    </Group>
  );
}
