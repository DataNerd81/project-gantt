import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6CC5C0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull().default("Planning"),
  assigned: text("assigned").default(""),
  startDate: text("start_date").notNull(),
  days: integer("days").notNull().default(1),
  progress: integer("progress").notNull().default(0),
  isMilestone: boolean("is_milestone").notNull().default(false),
  color: text("color").default("#6CC5C0"),
  parentId: text("parent_id"),
  collapsed: boolean("collapsed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  dependencies: jsonb("dependencies").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
