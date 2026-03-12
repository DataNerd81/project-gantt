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
    const subtaskIdx = colIndex(["subtask"]);
    const categoryIdx = colIndex(["category"]);
    const assignedIdx = colIndex(["assigned", "assignedto"]);
    const progressIdx = colIndex(["progress"]);
    const startDateIdx = colIndex(["startdate", "start"]);
    const daysIdx = colIndex(["days", "duration"]);
    const milestoneIdx = colIndex(["milestone"]);
    const colorIdx = colIndex(["color", "colour"]);
    const parentIdx = colIndex(["parenttask", "parent", "subtaskof"]);

    // Need at least a Task Name or Sub Task column
    if (nameIdx === -1 && subtaskIdx === -1) {
      return NextResponse.json(
        {
          error:
            'Could not find a "Task Name", "Name", or "Sub Task" column in the CSV header',
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

      // If a "Sub Task" column exists and has a value, use it as the task name.
      // Otherwise fall back to "Task Name" column.
      const subtaskName = subtaskIdx >= 0 ? cols[subtaskIdx]?.trim() : "";
      const taskName = nameIdx >= 0 ? cols[nameIdx]?.trim() : "";
      const name = subtaskName || taskName;
      if (!name) {
        errors.push(`Row ${i + 1}: Missing task name, skipped`);
        continue;
      }

      // Track requested parent name for second pass.
      // If a "Parent Task" column exists, use it. Otherwise, if there's a
      // "Sub Task" column, treat the "Task Name" column as the parent name.
      let wantParent: string | null = null;
      if (parentIdx >= 0 && cols[parentIdx]?.trim()) {
        wantParent = cols[parentIdx].trim();
      } else if (subtaskIdx >= 0 && subtaskName && taskName && taskName !== subtaskName) {
        // "Sub Task" is the task, "Task Name" acts as parent group
        wantParent = taskName;
      }

      // Parse start date - accept various formats
      let startDate = "";
      if (startDateIdx >= 0 && cols[startDateIdx]) {
        const raw = cols[startDateIdx].trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
          // ISO format: YYYY-MM-DD
          startDate = raw.slice(0, 10);
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
          // DD/MM/YYYY or D/MM/YYYY format
          const [d, m, y] = raw.split("/");
          const dd = d.padStart(2, "0");
          const mm = m.padStart(2, "0");
          startDate = `${y}-${mm}-${dd}`;
        } else if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(raw)) {
          // DD/MM/YY short year format
          const [d, m, y] = raw.split("/");
          const dd = d.padStart(2, "0");
          const mm = m.padStart(2, "0");
          const yyyy = parseInt(y) > 50 ? `19${y}` : `20${y}`;
          startDate = `${yyyy}-${mm}-${dd}`;
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

      let progress = 0;
      if (progressIdx >= 0 && cols[progressIdx]) {
        const pVal = parseFloat(cols[progressIdx]) || 0;
        // If value is between 0 and 1 (exclusive), treat as decimal (0.5 = 50%)
        progress = pVal > 0 && pVal < 1 ? Math.round(pVal * 100) : Math.round(pVal);
        progress = Math.min(100, Math.max(0, progress));
      }

      const categoryVal =
        categoryIdx >= 0 && cols[categoryIdx] ? cols[categoryIdx].trim() : "";
      const isMilestone =
        (milestoneIdx >= 0 && cols[milestoneIdx]
          ? cols[milestoneIdx].toLowerCase() === "true" ||
            cols[milestoneIdx] === "1"
          : false) || categoryVal.toLowerCase() === "milestone";

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
        let parentId = nameToId.get(task.wantParent!.toLowerCase());

        // Auto-create the parent task if it doesn't exist
        if (!parentId) {
          const autoId = `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_auto`;
          try {
            await db.insert(tasks).values({
              id: autoId,
              projectId,
              name: task.wantParent!,
              category: "Planning",
              assigned: "",
              startDate: new Date().toISOString().slice(0, 10),
              days: 1,
              progress: 0,
              isMilestone: false,
              color: "#6CC5C0",
              parentId: null,
              collapsed: false,
              sortOrder: -1,
              dependencies: [],
            });
            parentId = autoId;
            nameToId.set(task.wantParent!.toLowerCase(), autoId);
          } catch {
            errors.push(`"${task.name}": failed to auto-create parent "${task.wantParent}"`);
          }
        }

        if (parentId && parentId !== task.id) {
          await db
            .update(tasks)
            .set({ parentId })
            .where(eq(tasks.id, task.id));
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
