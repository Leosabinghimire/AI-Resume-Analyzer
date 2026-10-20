import { Badge } from "@mantine/core";
import { VERSION_SOURCE_META } from "@/lib/constants";
import type { VersionSource } from "@/types/api";

export function VersionSourceBadge({ source }: { source: VersionSource }) {
  const meta = VERSION_SOURCE_META[source];
  return (
    <Badge variant="light" color={meta.color}>
      {meta.label}
    </Badge>
  );
}
