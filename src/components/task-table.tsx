"use client";

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
}

export function TaskTable({
  displayItems,
  idToNumber,
  onEdit,
  onDelete,
  onToggleCollapse,
}: TaskTableProps) {
  const visibleItems = displayItems.filter((item) => item.visible);

  if (visibleItems.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-[#8899A6]">
        No tasks yet. Click &quot;+ Add Task&quot; to get started.
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#3A4149] text-left text-xs text-[#8899A6]">
            <th className="w-12 px-2 py-2">#</th>
            <th className="min-w-[180px] px-2 py-2">Task</th>
            <th className="px-2 py-2">Category</th>
            <th className="px-2 py-2">Assigned</th>
            <th className="px-2 py-2">Progress</th>
            <th className="px-2 py-2">Start</th>
            <th className="w-14 px-2 py-2 text-center">Days</th>
            <th className="px-2 py-2">Deps</th>
            <th className="w-20 px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.map((item) => {
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

            return (
              <tr
                key={t.id}
                className={`border-b border-[#3A4149]/50 hover:bg-[#262B30] ${
                  item.isParent ? "bg-[#1A1D21] font-semibold" : ""
                } ${item.depth > 0 ? "text-[#8899A6]" : ""}`}
              >
                <td className="px-2 py-2 text-[#8899A6]">
                  {item.displayNumber}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1.5">
                    {item.depth > 0 && (
                      <span className="ml-4 text-[#3A4149]">&#8627;</span>
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
                <td className="px-2 py-2">
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
                <td className="px-2 py-2 text-[#8899A6]">
                  {t.assigned || "-"}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#3A4149]">
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
                <td className="px-2 py-2 text-xs text-[#8899A6]">
                  {formatDate(parseDate(t.startDate))}
                </td>
                <td className="px-2 py-2 text-center">{t.days}</td>
                <td className="px-2 py-2 text-xs text-[#8899A6]">
                  {depDisplay || "-"}
                </td>
                <td className="px-2 py-2">
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
