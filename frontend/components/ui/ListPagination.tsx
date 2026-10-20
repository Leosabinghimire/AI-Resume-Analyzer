import { Group, Pagination, Text } from "@mantine/core";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

/** "Showing x–y of z" summary plus page controls; renders nothing for a single page. */
export function ListPagination({ page, pageSize, total, onChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <Group justify="space-between" gap="sm">
      <Text size="sm" c="dimmed">
        Showing {from}–{to} of {total}
      </Text>
      <Pagination value={page} onChange={onChange} total={pages} size="sm" />
    </Group>
  );
}
