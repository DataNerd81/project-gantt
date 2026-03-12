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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  if (projects.length === 0) return null;

  function handleDoubleClick(e: React.MouseEvent, p: ProjectData) {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(p.id);
    setEditName(p.name);
  }

  function handleRenameSubmit(id: string) {
    const trimmed = editName.trim();
    if (trimmed && onRename) {
      onRename(id, trimmed);
    }
    setEditingId(null);
  }

  return (
    <Select value={currentProjectId || ""} onValueChange={(v) => { if (v) onSelect(v); }}>
      <SelectTrigger className="w-[240px] border-[#3A4149] bg-[#262B30] text-white">
        <SelectValue placeholder="Select a project" />
      </SelectTrigger>
      <SelectContent className="border-[#3A4149] bg-[#262B30] text-white">
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {editingId === p.id ? (
              <input
                ref={inputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRenameSubmit(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit(p.id);
                  if (e.key === "Escape") setEditingId(null);
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full border-b border-[#6CC5C0] bg-transparent text-white outline-none"
              />
            ) : (
              <div
                className="flex items-center gap-2"
                onDoubleClick={(e) => handleDoubleClick(e, p)}
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ background: p.color }}
                />
                {p.name}
              </div>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
