import { describe, it, expect, vi, beforeEach } from "vitest";

// Test the password hashing logic used in the auth route
describe("Auth - Password Hashing", () => {
  const AUTH_HASH =
    "869a667a5d700acc702923e0794901b3901354cd072467b293d0c3c249e463ca";

  async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  it("produces consistent SHA-256 hashes", async () => {
    const hash1 = await hashPassword("test-password");
    const hash2 = await hashPassword("test-password");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different passwords", async () => {
    const hash1 = await hashPassword("password1");
    const hash2 = await hashPassword("password2");
    expect(hash1).not.toBe(hash2);
  });

  it("produces 64 character hex strings", async () => {
    const hash = await hashPassword("any-password");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects wrong password hash comparison", async () => {
    const wrongHash = await hashPassword("wrong-password");
    expect(wrongHash).not.toBe(AUTH_HASH);
  });
});
