import { jsPDF } from "jspdf";
import { ProjectData } from "./types";

// Colors
type RGB = [number, number, number];
const TEAL: RGB = [108, 197, 192];       // #6CC5C0
const DARK_BG: RGB = [26, 29, 33];       // #1A1D21
const LIGHT_TEXT: RGB = [60, 65, 72];    // #3C4148
const MID_GREY: RGB = [150, 155, 162];   // #969BA2
const BAR_BG: RGB = [230, 232, 235];     // #E6E8EB
const GREEN: RGB = [52, 211, 153];       // #34D399
const AMBER: RGB = [251, 191, 36];       // #FBBF24
const RED: RGB = [248, 113, 113];        // #F87171

function progressColor(pct: number): RGB {
  if (pct >= 75) return GREEN;
  if (pct >= 25) return AMBER;
  return RED;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function drawDonutChart(
  doc: jsPDF,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  progress: number
) {
  const steps = 100;

  // Background ring (light grey)
  doc.setFillColor(...BAR_BG);
  drawArc(doc, cx, cy, outerR, innerR, 0, 360, steps);

  // Progress arc
  if (progress > 0) {
    const color = progressColor(progress);
    doc.setFillColor(...color);
    const angle = (progress / 100) * 360;
    drawArc(doc, cx, cy, outerR, innerR, -90, -90 + angle, steps);
  }

  // Center text
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_BG);
  doc.text(`${progress}%`, cx, cy + 2, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MID_GREY);
  doc.text("COMPLETE", cx, cy + 9, { align: "center" });
}

function drawArc(
  doc: jsPDF,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
  steps: number
) {
  const toRad = Math.PI / 180;
  const points: [number, number][] = [];

  // Outer arc
  for (let i = 0; i <= steps; i++) {
    const angle = (startDeg + (endDeg - startDeg) * (i / steps)) * toRad;
    points.push([cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle)]);
  }
  // Inner arc (reverse)
  for (let i = steps; i >= 0; i--) {
    const angle = (startDeg + (endDeg - startDeg) * (i / steps)) * toRad;
    points.push([cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle)]);
  }

  if (points.length < 3) return;

  // Draw filled polygon
  const [first, ...rest] = points;
  doc.moveTo(first[0], first[1]);
  for (const [x, y] of rest) {
    doc.lineTo(x, y);
  }
  doc.lineTo(first[0], first[1]);
  doc.fill();
}

function drawProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  progress: number
) {
  // Background
  doc.setFillColor(...BAR_BG);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, "F");

  // Fill
  if (progress > 0) {
    const fillWidth = Math.max(height, (progress / 100) * width);
    const color = progressColor(progress);
    doc.setFillColor(...color);
    doc.roundedRect(x, y, fillWidth, height, height / 2, height / 2, "F");
  }
}

export function generateProjectPDF(project: ProjectData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  const tasks = project.tasks || [];
  const topLevelTasks = tasks
    .filter((t) => !t.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Calculate overall progress (weighted by days)
  let totalWeightedProgress = 0;
  let totalDays = 0;
  for (const t of topLevelTasks) {
    totalWeightedProgress += t.progress * t.days;
    totalDays += t.days;
  }
  const overallProgress =
    totalDays > 0 ? Math.round(totalWeightedProgress / totalDays) : 0;

  // Count stats
  const completed = topLevelTasks.filter((t) => t.progress === 100).length;
  const inProgress = topLevelTasks.filter(
    (t) => t.progress > 0 && t.progress < 100
  ).length;
  const notStarted = topLevelTasks.filter((t) => t.progress === 0).length;

  // ===== PAGE 1: TITLE PAGE =====
  // Teal accent bar at top
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, 4, "F");

  // Project name
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_BG);
  const titleLines = doc.splitTextToSize(project.name, contentWidth);
  doc.text(titleLines, pageWidth / 2, 70, { align: "center" });

  // Subtitle
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MID_GREY);
  doc.text("Project Status Report", pageWidth / 2, 85, { align: "center" });

  // Date
  doc.setFontSize(11);
  doc.text(formatDate(new Date()), pageWidth / 2, 95, { align: "center" });

  // Divider line
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 30, 105, pageWidth / 2 + 30, 105);

  // Summary stats in a row
  const statsY = 125;
  const statWidth = contentWidth / 3;

  const stats = [
    { label: "Completed", value: String(completed), color: GREEN },
    { label: "In Progress", value: String(inProgress), color: AMBER },
    { label: "Not Started", value: String(notStarted), color: RED },
  ];

  stats.forEach((stat, i) => {
    const sx = margin + statWidth * i + statWidth / 2;
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...stat.color);
    doc.text(stat.value, sx, statsY, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MID_GREY);
    doc.text(stat.label, sx, statsY + 7, { align: "center" });
  });

  // Total tasks
  doc.setFontSize(10);
  doc.setTextColor(...MID_GREY);
  doc.text(
    `${topLevelTasks.length} top-level task${topLevelTasks.length !== 1 ? "s" : ""} in total`,
    pageWidth / 2,
    statsY + 20,
    { align: "center" }
  );

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(...MID_GREY);
  doc.text("Generated by Project Gantt", pageWidth / 2, pageHeight - 15, {
    align: "center",
  });

  // ===== PAGE 2: OVERVIEW =====
  doc.addPage();

  // Teal accent bar
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, 4, "F");

  // Section title
  let y = 20;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_BG);
  doc.text("Project Overview", margin, y);
  y += 12;

  // Donut chart
  const chartCx = pageWidth / 2;
  const chartCy = y + 30;
  drawDonutChart(doc, chartCx, chartCy, 25, 17, overallProgress);
  y = chartCy + 40;

  // Summary line
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MID_GREY);
  const summaryText = `${completed} of ${topLevelTasks.length} tasks complete${inProgress > 0 ? `, ${inProgress} in progress` : ""}`;
  doc.text(summaryText, pageWidth / 2, y, { align: "center" });
  y += 15;

  // Divider
  doc.setDrawColor(...BAR_BG);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Task breakdown heading
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_BG);
  doc.text("Task Breakdown", margin, y);
  y += 10;

  // Task list with progress bars
  const barHeight = 6;
  const barWidth = 60;
  const barX = pageWidth - margin - barWidth;
  const pctX = barX - 12;

  for (const task of topLevelTasks) {
    // Check if we need a new page
    if (y > pageHeight - 25) {
      doc.addPage();
      doc.setFillColor(...TEAL);
      doc.rect(0, 0, pageWidth, 4, "F");
      y = 20;
    }

    // Task name (truncate if needed)
    const maxNameWidth = pctX - margin - 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LIGHT_TEXT);

    let taskName = task.name;
    if (task.isMilestone) taskName = "\u25C6 " + taskName;

    const truncated = doc.splitTextToSize(taskName, maxNameWidth);
    doc.text(truncated[0] as string, margin, y + barHeight / 2 + 1);

    // Progress percentage
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const pColor = progressColor(task.progress);
    doc.setTextColor(...pColor);
    doc.text(`${task.progress}%`, pctX, y + barHeight / 2 + 1, {
      align: "right",
    });

    // Progress bar
    drawProgressBar(doc, barX, y - 1, barWidth, barHeight, task.progress);

    y += 14;
  }

  // Footer on last page
  doc.setFontSize(8);
  doc.setTextColor(...MID_GREY);
  doc.text(
    "Generated by Project Gantt",
    pageWidth / 2,
    pageHeight - 15,
    { align: "center" }
  );

  // Download
  const fileName = `${project.name.replace(/\s+/g, "_")}_Report_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}
