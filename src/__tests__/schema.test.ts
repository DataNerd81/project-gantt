import { describe, it, expect } from "vitest";
import { projects, tasks } from "@/lib/db/schema";
import { getTableName } from "drizzle-orm";

describe("Database Schema", () => {
  describe("projects table", () => {
    it("has correct table name", () => {
      expect(getTableName(projects)).toBe("projects");
    });

    it("has required columns", () => {
      const columns = Object.keys(projects);
      expect(columns).toContain("id");
      expect(columns).toContain("name");
      expect(columns).toContain("color");
      expect(columns).toContain("createdAt");
      expect(columns).toContain("updatedAt");
    });
  });

  describe("tasks table", () => {
    it("has correct table name", () => {
      expect(getTableName(tasks)).toBe("tasks");
    });

    it("has required columns", () => {
      const columns = Object.keys(tasks);
      expect(columns).toContain("id");
      expect(columns).toContain("projectId");
      expect(columns).toContain("name");
      expect(columns).toContain("category");
      expect(columns).toContain("assigned");
      expect(columns).toContain("startDate");
      expect(columns).toContain("days");
      expect(columns).toContain("progress");
      expect(columns).toContain("isMilestone");
      expect(columns).toContain("color");
      expect(columns).toContain("parentId");
      expect(columns).toContain("collapsed");
      expect(columns).toContain("sortOrder");
      expect(columns).toContain("dependencies");
    });
  });
});
