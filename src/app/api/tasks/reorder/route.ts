import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { getUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  // body.updates: Array<{ id: string, sortOrder: number, parentId: string | null }>

  // Run all updates in parallel for speed
  await Promise.all(
    body.updates.map((update: { id: string; sortOrder: number; parentId: string | null }) =>
      db
        .update(tasks)
        .set({
          sortOrder: update.sortOrder,
          parentId: update.parentId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, update.id))
    )
  );

  return NextResponse.json({ success: true });
}
