import { act, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, EmptyState, IconAction, ListPagination, PriorityList, SearchInput, SectionCard } from "@/components/ui";
import { useSelection } from "@/hooks/useSelection";
import { renderWithProviders } from "../test-utils";

describe("DataTable", () => {
  it("renders typed columns and rows", () => {
    renderWithProviders(
      <DataTable
        columns={[
          { key: "name", header: "Name", render: (r: { id: string; name: string }) => r.name },
          { key: "id", header: "Id", render: (r) => r.id, align: "right" },
        ]}
        rows={[{ id: "1", name: "Alpha" }, { id: "2", name: "Beta" }]}
        rowKey={(r) => r.id}
        caption="Things"
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("cell", { name: "Beta" })).toBeInTheDocument();
  });
});

describe("PriorityList", () => {
  it("shows priority badges with titles and details, or an empty message", () => {
    const { rerender } = renderWithProviders(
      <PriorityList items={[{ key: "a", priority: "high", title: "Skills", detail: "Add Docker experience" }]} />,
    );
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Add Docker experience")).toBeInTheDocument();
    rerender(<PriorityList items={[]} empty="All good" />);
    expect(screen.getByText("All good")).toBeInTheDocument();
  });
});

describe("ListPagination", () => {
  it("summarizes the visible range and hides for a single page", () => {
    const onChange = vi.fn();
    const { rerender } = renderWithProviders(<ListPagination page={2} pageSize={10} total={25} onChange={onChange} />);
    expect(screen.getByText("Showing 11–20 of 25")).toBeInTheDocument();
    rerender(<ListPagination page={1} pageSize={10} total={8} onChange={onChange} />);
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });
});

describe("SearchInput", () => {
  it("reports changes and can be cleared", async () => {
    const onChange = vi.fn();
    renderWithProviders(<SearchInput value="react" onChange={onChange} placeholder="Search jobs" />);
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});

describe("IconAction", () => {
  it("is an accessible icon button", async () => {
    const onClick = vi.fn();
    renderWithProviders(<IconAction label="Delete item" icon={<span>x</span>} onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete item" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("SectionCard and EmptyState", () => {
  it("renders header, actions and body", () => {
    renderWithProviders(
      <SectionCard title="Skills" description="What matched" actions={<button>Edit</button>}>
        <EmptyState icon={<span />} title="Nothing yet" description="Add something" compact />
      </SectionCard>,
    );
    expect(screen.getByRole("heading", { name: "Skills" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nothing yet" })).toBeInTheDocument();
  });
});

describe("useSelection", () => {
  it("toggles ids up to the maximum", () => {
    const { result } = renderHook(() => useSelection(2));
    act(() => result.current.toggle("a"));
    act(() => result.current.toggle("b"));
    act(() => result.current.toggle("c"));
    expect(result.current.selected).toEqual(["a", "b"]);
    expect(result.current.isFull).toBe(true);
    act(() => result.current.toggle("a"));
    expect(result.current.selected).toEqual(["b"]);
  });
});
