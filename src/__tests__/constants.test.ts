import { describe, it, expect } from "vitest";
import { CATEGORY_COLORS, CATEGORIES, DAY_WIDTH } from "@/lib/constants";

describe("Constants", () => {
  it("has all expected categories", () => {
    expect(CATEGORIES).toContain("Planning");
    expect(CATEGORIES).toContain("Design");
    expect(CATEGORIES).toContain("Development");
    expect(CATEGORIES).toContain("Testing");
    expect(CATEGORIES).toContain("Deployment");
    expect(CATEGORIES).toContain("Management");
  });

  it("has colors for all categories", () => {
    CATEGORIES.forEach((cat) => {
      expect(CATEGORY_COLORS[cat]).toBeDefined();
      expect(CATEGORY_COLORS[cat]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("DAY_WIDTH is a positive number", () => {
    expect(DAY_WIDTH).toBeGreaterThan(0);
    expect(typeof DAY_WIDTH).toBe("number");
  });
});
