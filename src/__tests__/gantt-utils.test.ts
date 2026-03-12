import { describe, it, expect } from "vitest";
import {
  buildDisplayList,
  buildNumberMap,
  recalcParent,
  parseDate,
  dateDiffDays,
  formatDate,
  todayStr,
  addDaysStr,
} from "@/lib/gantt-utils";
import { TaskData } from "@/lib/types";

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

describe("parseDate", () => {
  it("parses YYYY-MM-DD string to Date", () => {
    const d = parseDate("2026-03-15");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2); // 0-indexed
    expect(d.getDate()).toBe(15);
  });
});

describe("dateDiffDays", () => {
  it("calculates difference between two dates", () => {
    const a = new Date("2026-03-01T00:00:00");
    const b = new Date("2026-03-11T00:00:00");
    expect(dateDiffDays(a, b)).toBe(10);
  });

  it("returns 0 for same date", () => {
    const d = new Date("2026-03-01T00:00:00");
    expect(dateDiffDays(d, d)).toBe(0);
  });

  it("returns negative for reverse order", () => {
    const a = new Date("2026-03-11T00:00:00");
    const b = new Date("2026-03-01T00:00:00");
    expect(dateDiffDays(a, b)).toBe(-10);
  });
});

describe("formatDate", () => {
  it("formats date as DD Mon", () => {
    const d = new Date("2026-03-15T00:00:00");
    const formatted = formatDate(d);
    expect(formatted).toContain("15");
    expect(formatted).toContain("Mar");
  });
});

describe("todayStr", () => {
  it("returns YYYY-MM-DD format", () => {
    const s = todayStr();
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("addDaysStr", () => {
  it("adds days to a date string", () => {
    expect(addDaysStr("2026-03-01", 5)).toBe("2026-03-06");
  });

  it("handles month boundary", () => {
    expect(addDaysStr("2026-03-30", 3)).toBe("2026-04-02");
  });
});

describe("buildDisplayList", () => {
  it("returns empty list for no tasks", () => {
    expect(buildDisplayList([])).toEqual([]);
  });

  it("creates flat list for top-level tasks", () => {
    const tasks = [
      makeTask({ id: "t1", name: "Task 1", sortOrder: 0 }),
      makeTask({ id: "t2", name: "Task 2", sortOrder: 1 }),
    ];
    const list = buildDisplayList(tasks);
    expect(list).toHaveLength(2);
    expect(list[0].displayNumber).toBe("1");
    expect(list[1].displayNumber).toBe("2");
    expect(list[0].depth).toBe(0);
    expect(list[1].depth).toBe(0);
    expect(list[0].visible).toBe(true);
  });

  it("nests child tasks under parent", () => {
    const tasks = [
      makeTask({ id: "p1", name: "Parent", sortOrder: 0 }),
      makeTask({ id: "c1", name: "Child 1", sortOrder: 1, parentId: "p1" }),
      makeTask({ id: "c2", name: "Child 2", sortOrder: 2, parentId: "p1" }),
    ];
    const list = buildDisplayList(tasks);
    expect(list).toHaveLength(3);
    expect(list[0].displayNumber).toBe("1");
    expect(list[0].isParent).toBe(true);
    expect(list[1].displayNumber).toBe("1.1");
    expect(list[1].depth).toBe(1);
    expect(list[2].displayNumber).toBe("1.2");
  });

  it("hides children when parent is collapsed", () => {
    const tasks = [
      makeTask({ id: "p1", name: "Parent", sortOrder: 0, collapsed: true }),
      makeTask({ id: "c1", name: "Child 1", sortOrder: 1, parentId: "p1" }),
    ];
    const list = buildDisplayList(tasks);
    expect(list[0].visible).toBe(true);
    expect(list[1].visible).toBe(false);
  });

  it("shows children when parent is expanded", () => {
    const tasks = [
      makeTask({ id: "p1", name: "Parent", sortOrder: 0, collapsed: false }),
      makeTask({ id: "c1", name: "Child 1", sortOrder: 1, parentId: "p1" }),
    ];
    const list = buildDisplayList(tasks);
    expect(list[1].visible).toBe(true);
  });
});

describe("buildNumberMap", () => {
  it("builds bidirectional map", () => {
    const tasks = [
      makeTask({ id: "t1", sortOrder: 0 }),
      makeTask({ id: "t2", sortOrder: 1 }),
    ];
    const list = buildDisplayList(tasks);
    const { idToNumber, numberToId } = buildNumberMap(list);
    expect(idToNumber["t1"]).toBe("1");
    expect(idToNumber["t2"]).toBe("2");
    expect(numberToId["1"]).toBe("t1");
    expect(numberToId["2"]).toBe("t2");
  });
});

describe("recalcParent", () => {
  it("calculates parent start from earliest child", () => {
    const tasks = [
      makeTask({ id: "p1", startDate: "2026-03-01", days: 1, progress: 0 }),
      makeTask({
        id: "c1",
        parentId: "p1",
        startDate: "2026-03-05",
        days: 3,
        progress: 100,
      }),
      makeTask({
        id: "c2",
        parentId: "p1",
        startDate: "2026-03-01",
        days: 2,
        progress: 50,
      }),
    ];
    const result = recalcParent(tasks, "p1");
    expect(result).not.toBeNull();
    expect(result!.startDate).toBe("2026-03-01");
    // Span: Mar 1 to Mar 8 (c1 ends Mar 5+3=Mar 8) = 7 days
    expect(result!.days).toBe(7);
  });

  it("calculates weighted progress", () => {
    const tasks = [
      makeTask({ id: "p1" }),
      makeTask({
        id: "c1",
        parentId: "p1",
        days: 4,
        progress: 100,
      }),
      makeTask({
        id: "c2",
        parentId: "p1",
        days: 6,
        progress: 0,
      }),
    ];
    const result = recalcParent(tasks, "p1");
    // Weighted: (100*4 + 0*6) / (4+6) = 40
    expect(result!.progress).toBe(40);
  });

  it("returns null for non-existent parent", () => {
    const result = recalcParent([], "nonexistent");
    expect(result).toBeNull();
  });

  it("returns null for parent with no children", () => {
    const tasks = [makeTask({ id: "p1" })];
    const result = recalcParent(tasks, "p1");
    expect(result).toBeNull();
  });
});
