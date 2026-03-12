"use client";

import { useRef, useCallback } from "react";
import { DisplayItem } from "@/lib/types";
import { DAY_WIDTH } from "@/lib/constants";
import { parseDate, dateDiffDays, formatDate } from "@/lib/gantt-utils";

interface GanttTimelineProps {
  displayItems: DisplayItem[];
  onEditTask: (taskId: string) => void;
}

export function GanttTimeline({ displayItems, onEditTask }: GanttTimelineProps) {
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const visibleItems = displayItems.filter((item) => item.visible);

  const syncScroll = useCallback((source: "scrollbar" | "body") => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    const scrollLeft =
      source === "scrollbar"
        ? scrollbarRef.current?.scrollLeft ?? 0
        : bodyRef.current?.scrollLeft ?? 0;
    if (scrollbarRef.current) scrollbarRef.current.scrollLeft = scrollLeft;
    if (bodyRef.current) bodyRef.current.scrollLeft = scrollLeft;
    if (headerRef.current) headerRef.current.scrollLeft = scrollLeft;
    isSyncing.current = false;
  }, []);

  if (visibleItems.length === 0) return null;

  // Calculate date range
  let calcMin: Date | null = null;
  let calcMax: Date | null = null;
  for (const item of visibleItems) {
    const t = item.task;
    const s = parseDate(t.startDate);
    const e = new Date(s);
    e.setDate(e.getDate() + t.days);
    if (!calcMin || s < calcMin) calcMin = new Date(s);
    if (!calcMax || e > calcMax) calcMax = new Date(e);
  }
  if (!calcMin || !calcMax) return null;
  calcMin.setDate(calcMin.getDate() - 3);
  calcMax.setDate(calcMax.getDate() + 7);
  const minDate = calcMin;
  const maxDate = calcMax;
  const totalDays = dateDiffDays(minDate, maxDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build month headers
  const months: { label: string; width: number }[] = [];
  let curMonth = "";
  let monthStartIdx = 0;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i);
    const mo = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    if (mo !== curMonth) {
      if (curMonth) {
        months.push({ label: curMonth, width: (i - monthStartIdx) * DAY_WIDTH });
      }
      curMonth = mo;
      monthStartIdx = i;
    }
  }
  months.push({ label: curMonth, width: (totalDays - monthStartIdx) * DAY_WIDTH });

  // Build day headers
  const days: { label: number; isWeekend: boolean; isToday: boolean }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i);
    days.push({
      label: d.getDate(),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isToday: d.getTime() === today.getTime(),
    });
  }

  const todayOffset = dateDiffDays(minDate, today);
  const showToday = todayOffset >= 0 && todayOffset < totalDays;
  const totalWidth = totalDays * DAY_WIDTH;

  // Build dependency arrows as SVG paths
  const taskIdToIdx: Record<string, number> = {};
  visibleItems.forEach((item, i) => {
    taskIdToIdx[item.task.id] = i;
  });

  const arrows: string[] = [];
  visibleItems.forEach((item, vi) => {
    item.task.dependencies.forEach((depId) => {
      const di = taskIdToIdx[depId];
      if (di === undefined) return;
      const depTask = visibleItems[di].task;
      const de = parseDate(depTask.startDate);
      de.setDate(de.getDate() + depTask.days);
      const x1 = dateDiffDays(minDate!, de) * DAY_WIDTH;
      const y1 = di * 35 + 17;
      const x2 = dateDiffDays(minDate!, parseDate(item.task.startDate)) * DAY_WIDTH;
      const y2 = vi * 35 + 17;
      const mx = x1 + (x2 - x1) / 2;
      arrows.push(
        `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
      );
    });
  });

  return (
    <div className="flex h-full flex-col">
      {/* Date header - scrolls horizontally in sync */}
      <div
        ref={headerRef}
        className="flex-none overflow-hidden bg-[#1A1D21]"
      >
        <div style={{ width: totalWidth }}>
          <div className="flex border-b border-[#3A4149]">
            {months.map((m, i) => (
              <div
                key={i}
                className="flex-none border-r border-[#3A4149]/50 px-1 py-1 text-center text-[10px] text-[#8899A6]"
                style={{ width: m.width }}
              >
                {m.label}
              </div>
            ))}
          </div>
          <div className="flex border-b border-[#3A4149]">
            {days.map((d, i) => (
              <div
                key={i}
                className={`flex-none text-center text-[10px] leading-6 ${
                  d.isToday
                    ? "bg-[#6CC5C0]/20 font-bold text-[#6CC5C0]"
                    : d.isWeekend
                    ? "bg-[#262B30]/50 text-[#8899A6]/50"
                    : "text-[#8899A6]"
                }`}
                style={{ width: DAY_WIDTH }}
              >
                {d.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Horizontal scrollbar - always visible below dates */}
      <div
        ref={scrollbarRef}
        className="flex-none overflow-x-auto overflow-y-hidden"
        style={{ height: 12 }}
        onScroll={() => syncScroll("scrollbar")}
      >
        <div style={{ width: totalWidth, height: 1 }} />
      </div>

      {/* Task body - scrolls vertically, horizontal scroll hidden (controlled by scrollbar above) */}
      <div
        ref={bodyRef}
        className="hide-scrollbar-x min-h-0 flex-1 overflow-y-auto"
        onScroll={() => syncScroll("body")}
      >
        <div
          className="relative"
          style={{ width: totalWidth, height: visibleItems.length * 35 }}
        >
          {/* Row backgrounds */}
          {visibleItems.map((_, ri) => (
            <div
              key={ri}
              className="absolute flex"
              style={{ top: ri * 35, height: 35, width: totalWidth }}
            >
              {days.map((d, di) => (
                <div
                  key={di}
                  className={`flex-none border-b border-r border-[#3A4149]/20 ${
                    d.isWeekend ? "bg-[#262B30]/30" : ""
                  }`}
                  style={{ width: DAY_WIDTH, height: 35 }}
                />
              ))}
            </div>
          ))}

          {/* Today line */}
          {showToday && (
            <div
              className="absolute top-0 z-10 w-px bg-[#6CC5C0]"
              style={{
                left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2,
                height: visibleItems.length * 35,
              }}
            />
          )}

          {/* Task bars */}
          {visibleItems.map((item, vi) => {
            const t = item.task;
            const sd = parseDate(t.startDate);
            const off = dateDiffDays(minDate!, sd);
            const left = off * DAY_WIDTH;
            const width = t.days * DAY_WIDTH;

            if (t.isMilestone) {
              return (
                <div
                  key={t.id}
                  className="absolute z-20 h-3.5 w-3.5 rotate-45 cursor-pointer bg-[#A78BFA] shadow-md"
                  style={{
                    left: left + DAY_WIDTH / 2 - 7,
                    top: vi * 35 + 10,
                  }}
                  title={`${t.name} (${formatDate(sd)})`}
                  onClick={() => onEditTask(t.id)}
                />
              );
            }

            if (item.isParent) {
              return (
                <div
                  key={t.id}
                  className="absolute z-20 h-3 cursor-pointer rounded-sm opacity-80"
                  style={{
                    left,
                    top: vi * 35 + 12,
                    width,
                    background: t.color || "#6CC5C0",
                  }}
                  title={`${t.name}: ${t.progress}% (${t.days}d)`}
                  onClick={() => onEditTask(t.id)}
                >
                  <div
                    className="h-full rounded-sm opacity-60"
                    style={{ width: `${t.progress}%`, background: "rgba(0,0,0,0.3)" }}
                  />
                </div>
              );
            }

            return (
              <div
                key={t.id}
                className="absolute z-20 flex h-[23px] cursor-pointer items-center overflow-hidden rounded-[3px] shadow-sm"
                style={{
                  left,
                  top: vi * 35 + 6,
                  width,
                  background: t.color || "#6CC5C0",
                }}
                title={`${t.name}: ${t.progress}% (${t.days}d)`}
                onClick={() => onEditTask(t.id)}
              >
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    width: `${t.progress}%`,
                    background: "rgba(0,0,0,0.3)",
                  }}
                />
                <span className="relative z-10 truncate px-1 text-[10px] font-medium text-white mix-blend-difference">
                  {t.name}
                </span>
              </div>
            );
          })}

          {/* Dependency arrows */}
          {arrows.length > 0 && (
            <svg
              className="pointer-events-none absolute left-0 top-0 z-30"
              width={totalWidth}
              height={visibleItems.length * 35}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon
                    points="0 0,8 3,0 6"
                    fill="rgba(108,197,192,0.5)"
                  />
                </marker>
              </defs>
              {arrows.map((path, i) => (
                <path
                  key={i}
                  d={path}
                  fill="none"
                  stroke="rgba(108,197,192,0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="4,3"
                  markerEnd="url(#arrowhead)"
                />
              ))}
            </svg>
          )}
        </div>
      </div>

    </div>
  );
}
