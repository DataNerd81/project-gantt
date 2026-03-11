import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { getUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const [task] = await db
    .insert(tasks)
    .values({
      id,
      projectId: body.projectId,
      name: body.name,
      category: body.category || "Planning",
      assigned: body.assigned || "",
      startDate: body.startDate,
      days: body.days || 1,
      progress: body.progress || 0,
      isMilestone: body.isMilestone || false,
      color: body.color || "#6CC5C0",
      parentId: body.parentId || null,
      collapsed: false,
      sortOrder: body.sortOrder || 0,
      dependencies: body.dependencies || [],
    })
    .returning();

  return NextResponse.json(task);
}
