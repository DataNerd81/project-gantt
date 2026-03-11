import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { getUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const [updated] = await db
    .update(tasks)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Delete child tasks first
  const childTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.parentId, id));

  for (const child of childTasks) {
    await db.delete(tasks).where(eq(tasks.id, child.id));
  }

  await db.delete(tasks).where(eq(tasks.id, id));

  return NextResponse.json({ success: true });
}
