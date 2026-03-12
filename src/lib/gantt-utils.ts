import { TaskData, DisplayItem } from "./types";

export function buildDisplayList(tasks: TaskData[]): DisplayItem[] {
  const sorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
  const result: DisplayItem[] = [];
  let topIndex = 0;

  for (const t of sorted) {
    if (t.parentId) continue;
    topIndex++;
    const isParent = sorted.some((c) => c.parentId === t.id);
    result.push({
      task: t,
      depth: 0,
      displayNumber: String(topIndex),
      isParent,
      visible: true,
    });
    if (isParent) {
      let childIndex = 0;
      for (const c of sorted) {
        if (c.parentId !== t.id) continue;
        childIndex++;
        result.push({
          task: c,
          depth: 1,
          displayNumber: `${topIndex}.${childIndex}`,
          isParent: false,
          visible: !t.collapsed,
        });
      }
    }
  }
  return result;
}

export function buildNumberMap(displayList: DisplayItem[]) {
  const idToNumber: Record<string, string> = {};
  const numberToId: Record<string, string> = {};
  displayList.forEach((item) => {
    idToNumber[item.task.id] = item.displayNumber;
    numberToId[item.displayNumber] = item.task.id;
  });
  return { idToNumber, numberToId };
}

export function recalcParent(
  tasks: TaskData[],
  parentId: string
): Partial<TaskData> | null {
  const parent = tasks.find((t) => t.id === parentId);
  if (!parent) return null;
  const children = tasks.filter((t) => t.parentId === parentId);
  if (children.length === 0) return null;

  let totalWeightedProgress = 0;
  let totalDays = 0;
  let minStart: Date | null = null;
  let maxEnd: Date | null = null;

  children.forEach((c) => {
    const s = new Date(c.startDate + "T00:00:00");
    const e = new Date(s);
    e.setDate(e.getDate() + c.days);
    if (!minStart || s < minStart) minStart = new Date(s);
    if (!maxEnd || e > maxEnd) maxEnd = new Date(e);
    totalWeightedProgress += c.progress * c.days;
    totalDays += c.days;
  });

  const spanDays = minStart && maxEnd
    ? Math.round((maxEnd.getTime() - minStart.getTime()) / 86400000)
    : totalDays;

  return {
    startDate: minStart!.toISOString().split("T")[0],
    days: Math.max(1, spanDays),
    progress: totalDays > 0 ? Math.round(totalWeightedProgress / totalDays) : 0,
  };
}

export function parseDate(s: string): Date {
  return new Date(s + "T00:00:00");
}

export function dateDiffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function formatDateFull(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function addDaysStr(s: string, n: number): string {
  const d = new Date(s);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
