import { cookies } from "next/headers";

const WORKOS_ENABLED = process.env.NEXT_PUBLIC_WORKOS_ENABLED === "true";

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export async function getUser(): Promise<User | null> {
  if (!WORKOS_ENABLED) {
    // Simple password-gate session
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

  // WorkOS AuthKit session
  const cookieStore = await cookies();
  const sessionData = cookieStore.get("workos_session");
  if (!sessionData?.value) return null;

  try {
    const user = JSON.parse(sessionData.value);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
    };
  } catch {
    return null;
  }
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

export async function createWorkOSSession(user: User): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("workos_session", JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("gantt_session");
  cookieStore.delete("workos_session");
}
