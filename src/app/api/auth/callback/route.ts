import { NextRequest, NextResponse } from "next/server";
import { WorkOS } from "@workos-inc/node";
import { createWorkOSSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const workos = new WorkOS(process.env.WORKOS_API_KEY!);

  try {
    const { user } = await workos.userManagement.authenticateWithCode({
      code,
      clientId: process.env.WORKOS_CLIENT_ID!,
    });

    await createWorkOSSession({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("WorkOS auth error:", error);
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }
}
