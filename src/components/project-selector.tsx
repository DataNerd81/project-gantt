"use client";

import { ProjectData } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectSelectorProps {
  projects: ProjectData[];
  currentProjectId: string | null;
  onSelect: (id: string) => void;
}

export function ProjectSelector({
  projects,
  currentProjectId,
  onSelect,
}: ProjectSelectorProps) {
  if (projects.length === 0) return null;

  return (
    <Select value={currentProjectId || ""} onValueChange={(v) => { if (v) onSelect(v); }}>
      <SelectTrigger className="w-[240px] border-[#3A4149] bg-[#262B30] text-white">
        <SelectValue placeholder="Select a project" />
      </SelectTrigger>
      <SelectContent className="border-[#3A4149] bg-[#262B30] text-white">
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ background: p.color }}
              />
              {p.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
