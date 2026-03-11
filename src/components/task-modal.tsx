"use client";

import { useState, useEffect } from "react";
import { TaskData, DisplayItem } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
import { todayStr, buildDisplayList, buildNumberMap } from "@/lib/gantt-utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: Partial<TaskData>) => void;
  editingTask: TaskData | null;
  tasks: TaskData[];
  isMilestone?: boolean;
}

export function TaskModal({
  open,
  onClose,
  onSave,
  editingTask,
  tasks,
  isMilestone = false,
}: TaskModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Planning");
  const [assigned, setAssigned] = useState("");
  const [startDate, setStartDate] = useState(todayStr());
  const [days, setDays] = useState(5);
  const [progress, setProgress] = useState(0);
  const [color, setColor] = useState("#6CC5C0");
  const [milestone, setMilestone] = useState(false);
  const [parentId, setParentId] = useState<string>("");
  const [depStr, setDepStr] = useState("");

  const displayList = buildDisplayList(tasks);
  const { idToNumber, numberToId } = buildNumberMap(displayList);

  const hasChildren = editingTask
    ? tasks.some((c) => c.parentId === editingTask.id)
    : false;

  useEffect(() => {
    if (editingTask) {
      setName(editingTask.name);
      setCategory(editingTask.category);
      setAssigned(editingTask.assigned || "");
      setStartDate(editingTask.startDate);
      setDays(editingTask.days);
      setProgress(editingTask.progress);
      setColor(editingTask.color || "#6CC5C0");
      setMilestone(editingTask.isMilestone);
      setParentId(editingTask.parentId || "");
      const depDisplay = editingTask.dependencies
        .map((dId) => idToNumber[dId] || "")
        .filter(Boolean);
      setDepStr(depDisplay.join(", "));
    } else {
      setName("");
      setCategory(isMilestone ? "Management" : "Planning");
      setAssigned("");
      setStartDate(todayStr());
      setDays(isMilestone ? 1 : 5);
      setProgress(0);
      setColor(isMilestone ? "#A78BFA" : "#6CC5C0");
      setMilestone(isMilestone);
      setParentId("");
      setDepStr("");
    }
  }, [editingTask, open, isMilestone]);

  function handleSave() {
    if (!name.trim()) return;

    const depIds = depStr
      .split(",")
      .map((s) => numberToId[s.trim()])
      .filter(Boolean);

    onSave({
      id: editingTask?.id,
      name: name.trim(),
      category,
      assigned: assigned.trim(),
      startDate: hasChildren ? editingTask!.startDate : startDate,
      days: hasChildren ? editingTask!.days : days,
      progress: hasChildren ? editingTask!.progress : Math.min(100, Math.max(0, progress)),
      isMilestone: milestone,
      color,
      parentId: parentId || null,
      dependencies: depIds,
      collapsed: editingTask?.collapsed ?? false,
    });
    onClose();
  }

  const topLevelTasks = displayList.filter(
    (item) => item.depth === 0 && item.task.id !== editingTask?.id
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md border-[#3A4149] bg-[#1A1D21] text-white">
        <DialogHeader>
          <DialogTitle className="text-[#6CC5C0]">
            {editingTask
              ? "Edit Task"
              : isMilestone
              ? "Add Milestone"
              : "Add Task"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Task Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-[#3A4149] bg-[#262B30] text-white"
              placeholder="Enter task name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => { if (v) setCategory(v); }}>
                <SelectTrigger className="border-[#3A4149] bg-[#262B30] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#3A4149] bg-[#262B30] text-white">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Assigned To</Label>
              <Input
                value={assigned}
                onChange={(e) => setAssigned(e.target.value)}
                className="border-[#3A4149] bg-[#262B30] text-white"
                placeholder="Name"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={hasChildren}
                className="border-[#3A4149] bg-[#262B30] text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label>Days</Label>
              <Input
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                disabled={hasChildren}
                className="border-[#3A4149] bg-[#262B30] text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label>Progress %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value) || 0)}
                disabled={hasChildren}
                className="border-[#3A4149] bg-[#262B30] text-white"
              />
            </div>
          </div>

          {hasChildren && (
            <p className="text-xs text-[#8899A6]">
              Start, days, and progress are auto-calculated from subtasks.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Parent Task</Label>
              <Select value={parentId} onValueChange={(v) => { setParentId(v || ""); }}>
                <SelectTrigger className="border-[#3A4149] bg-[#262B30] text-white">
                  <SelectValue placeholder="(Top-level task)" />
                </SelectTrigger>
                <SelectContent className="border-[#3A4149] bg-[#262B30] text-white">
                  <SelectItem value="none">(Top-level task)</SelectItem>
                  {topLevelTasks.map((item) => (
                    <SelectItem key={item.task.id} value={item.task.id}>
                      {item.displayNumber}. {item.task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="grid gap-2">
            <Label>Dependencies (task numbers, comma-separated)</Label>
            <Input
              value={depStr}
              onChange={(e) => setDepStr(e.target.value)}
              className="border-[#3A4149] bg-[#262B30] text-white"
              placeholder="e.g. 1, 2.1"
            />
          </div>

          <div className="grid gap-2">
            <Label>Milestone</Label>
            <Select
              value={milestone ? "true" : "false"}
              onValueChange={(v) => { if (v) setMilestone(v === "true"); }}
            >
              <SelectTrigger className="border-[#3A4149] bg-[#262B30] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#3A4149] bg-[#262B30] text-white">
                <SelectItem value="false">No</SelectItem>
                <SelectItem value="true">Yes</SelectItem>
              </SelectContent>
            </Select>
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
            {editingTask ? "Update" : "Add"} Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
