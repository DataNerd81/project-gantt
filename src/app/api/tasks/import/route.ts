import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { getUser } from "@/lib/auth";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, csvContent } = body;

    if (!projectId || !csvContent) {
      return NextResponse.json(
        { error: "projectId and csvContent are required" },
        { status: 400 }
      );
    }

    const lines = csvContent
      .split(/\r?\n/)
      .filter((l: string) => l.trim() !== "");

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV must have a header row and at least one data row" },
        { status: 400 }
      );
    }

    // Parse header to find column indices
    const header = parseCSVLine(lines[0]).map((h: string) =>
      h.toLowerCase().replace(/[^a-z0-9%]/g, "")
    );

    const colIndex = (names: string[]) =>
      names.reduce<number>((found, name) => {
        if (found >= 0) return found;
        return header.findIndex((h) => h.includes(name));
      }, -1);

    const nameIdx = colIndex(["taskname", "name"]);
    const categoryIdx = colIndex(["category"]);
    const assignedIdx = colIndex(["assigned", "assignedto"]);
    const progressIdx = colIndex(["progress"]);
    const startDateIdx = colIndex(["startdate", "start"]);
    const daysIdx = colIndex(["days", "duration"]);
    const milestoneIdx = colIndex(["milestone"]);
    const colorIdx = colIndex(["color", "colour"]);
    const parentIdx = colIndex(["parenttask", "parent", "subtaskof"]);

    if (nameIdx === -1) {
      return NextResponse.json(
        {
          error:
            'Could not find a "Task Name" or "Name" column in the CSV header',
        },
        { status: 400 }
      );
    }

    const created: Array<{
      id: string;
      name: string;
      wantParent: string | null;
    }> = [];
    const errors: string[] = [];

    // First pass: create all tasks (without parent links)
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const name = cols[nameIdx];
      if (!name) {
        errors.push(`Row ${i + 1}: Missing task name, skipped`);
        continue;
      }

      // Track requested parent name for second pass
      const wantParent =
        parentIdx >= 0 && cols[parentIdx] ? cols[parentIdx].trim() : null;

      // Parse start date - accept various formats
      let startDate = "";
      if (startDateIdx >= 0 && cols[startDateIdx]) {
        const raw = cols[startDateIdx];
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
          startDate = raw.slice(0, 10);
        } else {
          const parsed = new Date(raw);
          if (!isNaN(parsed.getTime())) {
            startDate = parsed.toISOString().slice(0, 10);
          }
        }
      }
      if (!startDate) {
        startDate = new Date().toISOString().slice(0, 10);
      }

      const days =
        daysIdx >= 0 && cols[daysIdx]
          ? Math.max(1, parseInt(cols[daysIdx]) || 1)
          : 1;

      const progress =
        progressIdx >= 0 && cols[progressIdx]
          ? Math.min(100, Math.max(0, parseInt(cols[progressIdx]) || 0))
          : 0;

      const isMilestone =
        milestoneIdx >= 0 && cols[milestoneIdx]
          ? cols[milestoneIdx].toLowerCase() === "true" ||
            cols[milestoneIdx] === "1"
          : false;

      const id = `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${i}`;

      try {
        const [task] = await db
          .insert(tasks)
          .values({
            id,
            projectId,
            name,
            category:
              categoryIdx >= 0 && cols[categoryIdx]
                ? cols[categoryIdx]
                : "Planning",
            assigned:
              assignedIdx >= 0 && cols[assignedIdx] ? cols[assignedIdx] : "",
            startDate,
            days,
            progress,
            isMilestone,
            color:
              colorIdx >= 0 && cols[colorIdx] ? cols[colorIdx] : "#6CC5C0",
            parentId: null,
            collapsed: false,
            sortOrder: i - 1,
            dependencies: [],
          })
          .returning();
        created.push({ ...task, wantParent });
      } catch (e) {
        errors.push(`Row ${i + 1}: Failed to insert - ${(e as Error).message}`);
      }
    }

    // Second pass: link subtasks to their parents by name
    const needsParent = created.filter((t) => t.wantParent);
    if (needsParent.length > 0) {
      const { eq } = await import("drizzle-orm");

      // Build a name->id map from created tasks + existing project tasks
      const nameToId = new Map<string, string>();
      const existingTasks = await db
        .select({ id: tasks.id, name: tasks.name })
        .from(tasks)
        .where(eq(tasks.projectId, projectId));
      for (const t of existingTasks) {
        nameToId.set(t.name.toLowerCase(), t.id);
      }

      for (const task of needsParent) {
        const parentId = nameToId.get(task.wantParent!.toLowerCase());
        if (parentId && parentId !== task.id) {
          await db
            .update(tasks)
            .set({ parentId })
            .where(eq(tasks.id, task.id));
        } else if (!parentId) {
          errors.push(`"${task.name}": parent "${task.wantParent}" not found`);
        }
      }
    }

    return NextResponse.json({
      imported: created.length,
      errors,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Import failed: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
