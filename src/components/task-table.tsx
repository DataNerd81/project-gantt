"use client";

import { useState, useRef } from "react";
import { DisplayItem } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/constants";
import { formatDate, parseDate } from "@/lib/gantt-utils";
import { Badge } from "@/components/ui/badge";

interface TaskTableProps {
  displayItems: DisplayItem[];
  idToNumber: Record<string, string>;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onToggleCollapse: (taskId: string) => void;
  onReorder?: (taskId: string, newIndex: number) => void;
}

export function TaskTable({
  displayItems,
  idToNumber,
  onEdit,
  onDelete,
  onToggleCollapse,
  onReorder,
}: TaskTableProps) {
  const visibleItems = displayItems.filter((item) => item.visible);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragItemId = useRef<string | null>(null);

  if (visibleItems.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-[#8899A6]">
        No tasks yet. Click &quot;+ Add Task&quot; to get started.
      </div>
    );
  }

  function handleDragStart(e: React.DragEvent, taskId: string) {
    dragItemId.current = taskId;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    dragItemId.current = null;
    setDragOverIdx(null);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  }

  function handleDrop(e: React.DragEvent, dropIdx: number) {
    e.preventDefault();
    setDragOverIdx(null);
    const taskId = dragItemId.current;
    if (!taskId || !onReorder) return;
    onReorder(taskId, dropIdx);
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#3A4149] text-left text-xs text-[#8899A6]">
            {onReorder && <th className="w-8 px-1 py-2"></th>}
            <th className="w-10 px-1 py-2 md:w-12 md:px-2">#</th>
            <th className="min-w-[120px] px-1 py-2 md:min-w-[180px] md:px-2">Task</th>
            <th className="hidden px-2 py-2 sm:table-cell">Category</th>
            <th className="hidden px-2 py-2 md:table-cell">Assigned</th>
            <th className="px-1 py-2 md:px-2">Progress</th>
            <th className="hidden px-2 py-2 sm:table-cell">Start</th>
            <th className="w-12 px-1 py-2 text-center md:w-14 md:px-2">Days</th>
            <th className="hidden px-2 py-2 lg:table-cell">Deps</th>
            <th className="w-16 px-1 py-2 md:w-20 md:px-2"></th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.map((item, idx) => {
            const t = item.task;
            const progressColor =
              t.progress >= 80
                ? "#34D399"
                : t.progress >= 40
                ? "#FBBF24"
                : "#F87171";
            const depDisplay = t.dependencies
              .map((dId) => idToNumber[dId] || "?")
              .join(", ");

            const isDragOver = dragOverIdx === idx;

            return (
              <tr
                key={t.id}
                draggable={!!onReorder}
                onDragStart={(e) => handleDragStart(e, t.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                className={`border-b border-[#3A4149]/50 hover:bg-[#262B30] ${
                  item.isParent ? "bg-[#1A1D21] font-semibold" : ""
                } ${item.depth > 0 ? "text-[#8899A6]" : ""} ${
                  isDragOver ? "!border-t-2 !border-t-[#6CC5C0]" : ""
                }`}
              >
                {onReorder && (
                  <td className="px-1 py-2">
                    <span className="cursor-grab text-[#8899A6]/50 hover:text-[#8899A6] active:cursor-grabbing">
                      &#8942;&#8942;
                    </span>
                  </td>
                )}
                <td className="px-1 py-2 text-[#8899A6] md:px-2">
                  {item.displayNumber}
                </td>
                <td className="px-1 py-2 md:px-2">
                  <div className="flex items-center gap-1.5">
                    {item.depth > 0 && (
                      <span className="ml-2 text-[#3A4149] md:ml-4">&#8627;</span>
                    )}
                    {item.isParent && (
                      <button
                        onClick={() => onToggleCollapse(t.id)}
                        className="text-[#8899A6] hover:text-white"
                      >
                        {t.collapsed ? "\u25B6" : "\u25BC"}
                      </button>
                    )}
                    {t.isMilestone && (
                      <span className="inline-block h-2.5 w-2.5 rotate-45 bg-[#A78BFA]" />
                    )}
                    <span className="truncate" title={t.name}>
                      {t.name}
                    </span>
                  </div>
                </td>
                <td className="hidden px-2 py-2 sm:table-cell">
                  <Badge
                    variant="outline"
                    className="border-0 text-xs"
                    style={{
                      background: `${CATEGORY_COLORS[t.category] || "#8899A6"}22`,
                      color: CATEGORY_COLORS[t.category] || "#8899A6",
                    }}
                  >
                    {t.category}
                  </Badge>
                </td>
                <td className="hidden px-2 py-2 text-[#8899A6] md:table-cell">
                  {t.assigned || "-"}
                </td>
                <td className="px-1 py-2 md:px-2">
                  <div className="flex items-center gap-1 md:gap-2">
                    <div className="h-1.5 w-10 overflow-hidden rounded-full bg-[#3A4149] md:w-16">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${t.progress}%`,
                          background: progressColor,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs"
                      style={{ color: progressColor }}
                    >
                      {t.progress}%
                    </span>
                  </div>
                </td>
                <td className="hidden px-2 py-2 text-xs text-[#8899A6] sm:table-cell">
                  {formatDate(parseDate(t.startDate))}
                </td>
                <td className="px-1 py-2 text-center md:px-2">{t.days}</td>
                <td className="hidden px-2 py-2 text-xs text-[#8899A6] lg:table-cell">
                  {depDisplay || "-"}
                </td>
                <td className="px-1 py-2 md:px-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(t.id)}
                      className="rounded px-1.5 py-0.5 text-xs text-[#8899A6] hover:bg-[#3A4149] hover:text-white"
                      title="Edit"
                    >
                      &#9998;
                    </button>
                    <button
                      onClick={() => onDelete(t.id)}
                      className="rounded px-1.5 py-0.5 text-xs text-[#8899A6] hover:bg-red-900/30 hover:text-red-400"
                      title="Delete"
                    >
                      &#10005;
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
