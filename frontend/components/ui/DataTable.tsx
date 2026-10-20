import {
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  type MantineSize,
} from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  width?: CSSProperties["width"];
  align?: "left" | "right" | "center";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Below this width the table scrolls horizontally instead of squeezing columns. */
  minWidth?: number;
  isRowActive?: (row: T) => boolean;
  verticalSpacing?: MantineSize;
  caption?: string;
}

/** Generic, typed table used for every list view, so spacing, headers and scrolling stay consistent. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = 640,
  isRowActive,
  verticalSpacing = "sm",
  caption,
}: DataTableProps<T>) {
  return (
    <TableScrollContainer minWidth={minWidth}>
      <Table verticalSpacing={verticalSpacing} horizontalSpacing="lg" highlightOnHover>
        {caption && <caption style={{ position: "absolute", left: -9999 }}>{caption}</caption>}
        <TableThead>
          <TableTr>
            {columns.map((c) => (
              <TableTh key={c.key} w={c.width} ta={c.align}>
                {c.header}
              </TableTh>
            ))}
          </TableTr>
        </TableThead>
        <TableTbody>
          {rows.map((row) => (
            <TableTr
              key={rowKey(row)}
              bg={isRowActive?.(row) ? "var(--app-brand-soft)" : undefined}
            >
              {columns.map((c) => (
                <TableTd key={c.key} ta={c.align}>
                  {c.render(row)}
                </TableTd>
              ))}
            </TableTr>
          ))}
        </TableTbody>
      </Table>
    </TableScrollContainer>
  );
}
