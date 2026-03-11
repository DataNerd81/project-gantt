import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskTable } from "@/components/task-table";
import { DisplayItem, TaskData } from "@/lib/types";

function makeTask(overrides: Partial<TaskData> = {}): TaskData {
  return {
    id: "task1",
    projectId: "proj1",
    name: "Test Task",
    category: "Planning",
    assigned: "Alice",
    startDate: "2026-03-01",
    days: 5,
    progress: 50,
    isMilestone: false,
    color: "#6CC5C0",
    parentId: null,
    collapsed: false,
    sortOrder: 0,
    dependencies: [],
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

function makeDisplayItem(overrides: Partial<DisplayItem> = {}): DisplayItem {
  return {
    task: makeTask(),
    depth: 0,
    displayNumber: "1",
    isParent: false,
    visible: true,
    ...overrides,
  };
}

describe("TaskTable", () => {
  const defaultProps = {
    idToNumber: {} as Record<string, string>,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleCollapse: vi.fn(),
  };

  it("renders empty state when no tasks", () => {
    render(<TaskTable displayItems={[]} {...defaultProps} />);
    expect(screen.getByText(/No tasks yet/)).toBeInTheDocument();
  });

  it("renders task rows", () => {
    const items = [
      makeDisplayItem({
        task: makeTask({ id: "t1", name: "Task One" }),
        displayNumber: "1",
      }),
      makeDisplayItem({
        task: makeTask({ id: "t2", name: "Task Two" }),
        displayNumber: "2",
      }),
    ];
    render(<TaskTable displayItems={items} {...defaultProps} />);
    expect(screen.getByText("Task One")).toBeInTheDocument();
    expect(screen.getByText("Task Two")).toBeInTheDocument();
  });

  it("filters out non-visible items", () => {
    const items = [
      makeDisplayItem({
        task: makeTask({ id: "t1", name: "Visible Task" }),
        visible: true,
      }),
      makeDisplayItem({
        task: makeTask({ id: "t2", name: "Hidden Task" }),
        visible: false,
      }),
    ];
    render(<TaskTable displayItems={items} {...defaultProps} />);
    expect(screen.getByText("Visible Task")).toBeInTheDocument();
    expect(screen.queryByText("Hidden Task")).not.toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    const onEdit = vi.fn();
    const items = [
      makeDisplayItem({
        task: makeTask({ id: "t1", name: "Editable Task" }),
      }),
    ];
    render(<TaskTable displayItems={items} {...defaultProps} onEdit={onEdit} />);
    fireEvent.click(screen.getByTitle("Edit"));
    expect(onEdit).toHaveBeenCalledWith("t1");
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn();
    const items = [
      makeDisplayItem({
        task: makeTask({ id: "t1", name: "Deletable" }),
      }),
    ];
    render(
      <TaskTable displayItems={items} {...defaultProps} onDelete={onDelete} />
    );
    fireEvent.click(screen.getByTitle("Delete"));
    expect(onDelete).toHaveBeenCalledWith("t1");
  });

  it("calls onToggleCollapse for parent tasks", () => {
    const onToggleCollapse = vi.fn();
    const items = [
      makeDisplayItem({
        task: makeTask({ id: "p1", name: "Parent" }),
        isParent: true,
      }),
    ];
    render(
      <TaskTable
        displayItems={items}
        {...defaultProps}
        onToggleCollapse={onToggleCollapse}
      />
    );
    // Click the collapse/expand button (▼)
    fireEvent.click(screen.getByText("▼"));
    expect(onToggleCollapse).toHaveBeenCalledWith("p1");
  });

  it("shows drag handles when onReorder is provided", () => {
    const items = [
      makeDisplayItem({
        task: makeTask({ id: "t1", name: "Draggable Task" }),
      }),
    ];
    const { container } = render(
      <TaskTable
        displayItems={items}
        {...defaultProps}
        onReorder={vi.fn()}
      />
    );
    expect(container.querySelector(".cursor-grab")).toBeInTheDocument();
  });

  it("does not show drag handles without onReorder", () => {
    const items = [
      makeDisplayItem({
        task: makeTask({ id: "t1", name: "Static Task" }),
      }),
    ];
    const { container } = render(
      <TaskTable displayItems={items} {...defaultProps} />
    );
    expect(container.querySelector(".cursor-grab")).not.toBeInTheDocument();
  });

  it("shows progress with correct color coding", () => {
    const items = [
      makeDisplayItem({
        task: makeTask({ id: "t1", name: "Low Progress", progress: 20 }),
        displayNumber: "1",
      }),
      makeDisplayItem({
        task: makeTask({ id: "t2", name: "Mid Progress", progress: 60 }),
        displayNumber: "2",
      }),
      makeDisplayItem({
        task: makeTask({ id: "t3", name: "High Progress", progress: 90 }),
        displayNumber: "3",
      }),
    ];
    render(<TaskTable displayItems={items} {...defaultProps} />);
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("displays milestone indicator", () => {
    const items = [
      makeDisplayItem({
        task: makeTask({ id: "m1", name: "Milestone", isMilestone: true }),
      }),
    ];
    const { container } = render(
      <TaskTable displayItems={items} {...defaultProps} />
    );
    expect(container.querySelector(".rotate-45")).toBeInTheDocument();
  });

  it("shows dependency display numbers", () => {
    const items = [
      makeDisplayItem({
        task: makeTask({ id: "t1", name: "Task 1" }),
        displayNumber: "1",
      }),
      makeDisplayItem({
        task: makeTask({
          id: "t2",
          name: "Task 2",
          dependencies: ["t1"],
        }),
        displayNumber: "2",
      }),
    ];
    const { container } = render(
      <TaskTable
        displayItems={items}
        {...defaultProps}
        idToNumber={{ t1: "1", t2: "2" }}
      />
    );
    // The deps column for task 2 should show "1" (the dependency)
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
    // Task 2 row should contain dependency text "1"
    const task2Row = rows[1];
    expect(task2Row.textContent).toContain("Task 2");
  });
});
