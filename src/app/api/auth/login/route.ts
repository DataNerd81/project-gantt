import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

// SHA-256 hash of the password
const AUTH_HASH =
  "869a667a5d700acc702923e0794901b3901354cd072467b293d0c3c249e463ca";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  // Hash the password with SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  if (hashHex !== AUTH_HASH) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  await createSession();
  return NextResponse.json({ success: true });
}
