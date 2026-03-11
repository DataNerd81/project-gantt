import { cookies } from "next/headers";

// WorkOS auth stub - replace with real WorkOS integration when credentials are ready
// Set NEXT_PUBLIC_WORKOS_ENABLED="true" in .env.local to enable

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export async function getUser(): Promise<User | null> {
  const enabled = process.env.NEXT_PUBLIC_WORKOS_ENABLED === "true";

  if (!enabled) {
    // When WorkOS is disabled, check for simple session cookie
    const cookieStore = await cookies();
    const session = cookieStore.get("gantt_session");
    if (session?.value === "authenticated") {
      return {
        id: "local-user",
        email: "user@local",
        firstName: "Local",
        lastName: "User",
      };
    }
    return null;
  }

  // TODO: Implement WorkOS authentication
  // import { WorkOS } from '@workos-inc/node';
  // const workos = new WorkOS(process.env.WORKOS_API_KEY);
  // ... verify session JWT from cookie
  return null;
}

export async function createSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("gantt_session", "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("gantt_session");
}
