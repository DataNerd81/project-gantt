import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/db/schema";
import { getUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(projects.createdAt);

  const allTasks = await db
    .select()
    .from(tasks)
    .orderBy(tasks.sortOrder);

  const projectsWithTasks = allProjects.map((p) => ({
    ...p,
    tasks: allTasks.filter((t) => t.projectId === p.id),
  }));

  return NextResponse.json(projectsWithTasks);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const [project] = await db
    .insert(projects)
    .values({
      id,
      name: body.name,
      color: body.color || "#6CC5C0",
    })
    .returning();

  return NextResponse.json({ ...project, tasks: [] });
}
