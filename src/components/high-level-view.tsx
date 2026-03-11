"use client";

import { ProjectData } from "@/lib/types";
import { parseDate, dateDiffDays, formatDate, formatDateFull } from "@/lib/gantt-utils";

interface HighLevelViewProps {
  projects: ProjectData[];
  onSelectProject: (id: string) => void;
}

export function HighLevelView({ projects, onSelectProject }: HighLevelViewProps) {
  const projectsWithTasks = projects.filter((p) => p.tasks.length > 0);

  if (projectsWithTasks.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-[#8899A6]">
        No projects with tasks yet.
      </div>
    );
  }

  // Global date range
  let calcMin: Date | null = null;
  let calcMax: Date | null = null;
  for (const p of projectsWithTasks) {
    for (const t of p.tasks) {
      const s = parseDate(t.startDate);
      const e = new Date(s);
      e.setDate(e.getDate() + t.days);
      if (!calcMin || s < calcMin) calcMin = new Date(s);
      if (!calcMax || e > calcMax) calcMax = new Date(e);
    }
  }
  if (!calcMin || !calcMax) return null;
  calcMin.setDate(calcMin.getDate() - 7);
  calcMax.setDate(calcMax.getDate() + 10);
  const gMin = calcMin;
  const gMax = calcMax;
  const totalSpan = dateDiffDays(gMin, gMax);
  const PPD = 6;
  const trackWidth = totalSpan * PPD;

  // Build month/week headers
  const months: { label: string; px: number }[] = [];
  const c = new Date(gMin);
  while (c < gMax) {
    const ms = new Date(c);
    const me = new Date(c.getFullYear(), c.getMonth() + 1, 1);
    const end = me > gMax ? gMax : me;
    months.push({
      label: ms.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
      px: dateDiffDays(ms, end) * PPD,
    });
    c.setTime(me.getTime());
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPx = dateDiffDays(gMin, today) * PPD;
  const showToday = todayPx > 0 && todayPx < trackWidth;

  return (
    <div className="flex gap-0 overflow-hidden rounded-lg border border-[#3A4149]">
      {/* Left panel */}
      <div className="w-[300px] flex-none border-r border-[#3A4149]">
        <div className="flex border-b border-[#3A4149] bg-[#1A1D21] px-4 py-2 text-xs text-[#8899A6]">
          <span className="flex-1">Project</span>
          <span className="w-12 text-right">%</span>
        </div>
        <div className="max-h-[500px] overflow-auto">
          {projectsWithTasks.map((p) => {
            const topTasks = p.tasks.filter((t) => !t.parentId);
            const avgProg = topTasks.length
              ? Math.round(topTasks.reduce((s, t) => s + t.progress, 0) / topTasks.length)
              : 0;
            const progColor =
              avgProg >= 80 ? "#34D399" : avgProg >= 40 ? "#FBBF24" : "#F87171";

            let pMin: Date | null = null;
            let pMax: Date | null = null;
            p.tasks.forEach((t) => {
              const s = parseDate(t.startDate);
              const e = new Date(s);
              e.setDate(e.getDate() + t.days);
              if (!pMin || s < pMin) pMin = new Date(s);
              if (!pMax || e > pMax) pMax = new Date(e);
            });

            return (
              <div
                key={p.id}
                className="flex cursor-pointer items-center border-b border-[#3A4149]/50 px-4 py-3 hover:bg-[#262B30]"
                onClick={() => onSelectProject(p.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 flex-none rounded-full"
                      style={{ background: p.color }}
                    />
                    <span className="truncate text-sm font-medium">
                      {p.name}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#8899A6]">
                    {p.tasks.length} tasks &middot;{" "}
                    {p.tasks.filter((t) => t.isMilestone).length} milestones
                    {pMin && pMax && (
                      <>
                        {" "}
                        &middot; {formatDate(pMin)} - {formatDate(pMax)}
                      </>
                    )}
                  </p>
                </div>
                <span
                  className="w-12 text-right text-sm font-semibold"
                  style={{ color: progColor }}
                >
                  {avgProg}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right timeline */}
      <div className="flex-1 overflow-auto">
        {/* Month header */}
        <div className="sticky top-0 z-10 flex border-b border-[#3A4149] bg-[#1A1D21]" style={{ width: trackWidth }}>
          {months.map((m, i) => (
            <div
              key={i}
              className="flex-none border-r border-[#3A4149]/50 px-1 py-2 text-center text-[10px] text-[#8899A6]"
              style={{ width: m.px }}
            >
              {m.label}
            </div>
          ))}
        </div>

        {/* Project bars */}
        <div className="relative" style={{ width: trackWidth }}>
          {projectsWithTasks.map((p) => {
            let pMin: Date | null = null;
            let pMax: Date | null = null;
            p.tasks.forEach((t) => {
              const s = parseDate(t.startDate);
              const e = new Date(s);
              e.setDate(e.getDate() + t.days);
              if (!pMin || s < pMin) pMin = new Date(s);
              if (!pMax || e > pMax) pMax = new Date(e);
            });
            if (!pMin || !pMax) return null;

            const topTasks = p.tasks.filter((t) => !t.parentId);
            const avgProg = topTasks.length
              ? Math.round(topTasks.reduce((s, t) => s + t.progress, 0) / topTasks.length)
              : 0;

            const barLeft = dateDiffDays(gMin!, pMin) * PPD;
            const barWidth = dateDiffDays(pMin, pMax) * PPD;
            const progWidth = Math.round((avgProg / 100) * barWidth);

            return (
              <div
                key={p.id}
                className="relative border-b border-[#3A4149]/30"
                style={{ height: 48 }}
              >
                {/* Background bar */}
                <div
                  className="absolute rounded-sm bg-white/5"
                  style={{ left: barLeft, top: 12, width: barWidth, height: 24 }}
                />
                {/* Progress fill */}
                <div
                  className="absolute rounded-sm"
                  style={{
                    left: barLeft,
                    top: 12,
                    width: progWidth,
                    height: 24,
                    background: p.color,
                    opacity: 0.7,
                  }}
                />
                {/* Milestones */}
                {p.tasks
                  .filter((t) => t.isMilestone)
                  .map((t) => {
                    const ms = parseDate(t.startDate);
                    const msPx = dateDiffDays(gMin!, ms) * PPD;
                    return (
                      <div
                        key={t.id}
                        className="absolute h-2.5 w-2.5 rotate-45 bg-[#A78BFA]"
                        style={{ left: msPx - 5, top: 19 }}
                        title={`${t.name} - ${formatDateFull(ms)}`}
                      />
                    );
                  })}
                {/* Today line */}
                {showToday && (
                  <div
                    className="absolute top-0 w-px bg-[#6CC5C0]/50"
                    style={{ left: todayPx, height: 48 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
