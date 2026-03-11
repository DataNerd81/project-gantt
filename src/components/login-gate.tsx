"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginGate({
  onAuthenticated,
}: {
  onAuthenticated: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      onAuthenticated();
    } else {
      setError("Incorrect password");
      setPassword("");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111416]">
      <div className="w-[90%] max-w-[380px] rounded-2xl border border-[#3A4149] bg-[#1A1D21] p-12 text-center shadow-2xl">
        <img
          src="/sesg-logo.svg"
          alt="SESG Logo"
          className="mx-auto mb-4 h-12"
        />
        <h2 className="mb-1.5 text-xl font-semibold text-[#6CC5C0]">
          Project Gantt
        </h2>
        <p className="mb-6 text-sm text-[#8899A6]">
          Enter the password to continue
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-[#3A4149] bg-[#262B30] text-white placeholder:text-[#8899A6]"
            autoFocus
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-[#6CC5C0] text-[#1A1D21] hover:bg-[#4DA8A3]"
          >
            {loading ? "Checking..." : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}
