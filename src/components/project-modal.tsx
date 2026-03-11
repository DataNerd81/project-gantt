"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
}

export function ProjectModal({ open, onClose, onSave }: ProjectModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6CC5C0");

  function handleSave() {
    if (!name.trim()) return;
    onSave(name.trim(), color);
    setName("");
    setColor("#6CC5C0");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm border-[#3A4149] bg-[#1A1D21] text-white">
        <DialogHeader>
          <DialogTitle className="text-[#6CC5C0]">New Project</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Project Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-[#3A4149] bg-[#262B30] text-white"
              placeholder="Enter project name"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label>Color</Label>
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 border-[#3A4149] bg-[#262B30]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#3A4149] text-[#8899A6] hover:bg-[#262B30]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#6CC5C0] text-[#1A1D21] hover:bg-[#4DA8A3]"
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
