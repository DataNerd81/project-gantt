"use client";

import { useState, useRef, useEffect } from "react";
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
  onRename?: (id: string, newName: string) => void;
}

export function ProjectSelector({
  projects,
  currentProjectId,
  onSelect,
  onRename,
}: ProjectSelectorProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (projects.length === 0) return null;

  function handleRenameSubmit() {
    const trimmed = editName.trim();
    if (trimmed && onRename && currentProjectId) {
      onRename(currentProjectId, trimmed);
    }
    setEditing(false);
  }

  function startEditing() {
    if (currentProject) {
      setEditName(currentProject.name);
      setEditing(true);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        onBlur={handleRenameSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleRenameSubmit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-[240px] rounded-md border border-[#6CC5C0] bg-[#262B30] px-3 py-1.5 text-sm text-white outline-none"
      />
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={currentProjectId || ""} onValueChange={(v) => { if (v) onSelect(v); }}>
        <SelectTrigger className="w-[240px] border-[#3A4149] bg-[#262B30] text-white">
          <SelectValue placeholder="Select a project">
            {(value: string | null) => {
              const p = projects.find((proj) => proj.id === value);
              return p ? p.name : "Select a project";
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="border-[#3A4149] bg-[#262B30] text-white">
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} label={p.name}>
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
      {onRename && currentProject && (
        <button
          onClick={startEditing}
          className="rounded p-1 text-[#8899A6] hover:bg-[#262B30] hover:text-white"
          title="Rename project"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </button>
      )}
    </div>
  );
}
