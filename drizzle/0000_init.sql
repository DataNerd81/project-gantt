CREATE TABLE IF NOT EXISTS "projects" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "color" text NOT NULL DEFAULT '#6CC5C0',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tasks" (
  "id" text PRIMARY KEY NOT NULL,
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "category" text NOT NULL DEFAULT 'Planning',
  "assigned" text DEFAULT '',
  "start_date" text NOT NULL,
  "days" integer NOT NULL DEFAULT 1,
  "progress" integer NOT NULL DEFAULT 0,
  "is_milestone" boolean NOT NULL DEFAULT false,
  "color" text DEFAULT '#6CC5C0',
  "parent_id" text,
  "collapsed" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "dependencies" jsonb NOT NULL DEFAULT '[]',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
