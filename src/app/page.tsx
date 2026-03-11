"use client";

import { useState, useEffect, useCallback } from "react";
import { ProjectData, TaskData } from "@/lib/types";
import { buildDisplayList, buildNumberMap, recalcParent } from "@/lib/gantt-utils";
import { LoginGate } from "@/components/login-gate";
import { ProjectSelector } from "@/components/project-selector";
import { ProjectModal } from "@/components/project-modal";
import { TaskModal } from "@/components/task-modal";
import { TaskTable } from "@/components/task-table";
import { GanttTimeline } from "@/components/gantt-timeline";
import { HighLevelView } from "@/components/high-level-view";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [view, setView] = useState<"detailed" | "highlevel">("detailed");
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskData | null>(null);
  const [isMilestone, setIsMilestone] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data: ProjectData[] = await res.json();
        setProjects(data);
        setCurrentProjectId((prev) => {
          if (prev && data.some((p) => p.id === prev)) return prev;
          return data.length > 0 ? data[0].id : null;
        });
      }
    } catch (e) {
      console.error("Failed to load projects:", e);
    }
    setLoading(false);
  }, []);

  // Check auth on mount
  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => {
        setAuthenticated(r.ok);
        if (r.ok) loadProjects();
        else setLoading(false);
      })
      .catch(() => {
        setAuthenticated(false);
        setLoading(false);
      });
  }, [loadProjects]);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const currentTasks = currentProject?.tasks || [];
  const displayList = buildDisplayList(currentTasks);
  const { idToNumber } = buildNumberMap(displayList);

  async function handleCreateProject(name: string, color: string) {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    if (res.ok) {
      const project = await res.json();
      setProjects((prev) => [...prev, project]);
      setCurrentProjectId(project.id);
    }
  }

  async function handleDeleteProject() {
    if (!currentProjectId) return;
    if (projects.length <= 1) {
      alert("You must have at least one project.");
      return;
    }
    if (!confirm("Delete this project and all its tasks?")) return;

    await fetch(`/api/projects/${currentProjectId}`, { method: "DELETE" });
    const remaining = projects.filter((p) => p.id !== currentProjectId);
    setProjects(remaining);
    setCurrentProjectId(remaining[0]?.id || null);
  }

  async function handleSaveTask(taskData: Partial<TaskData>) {
    if (!currentProjectId) return;

    const isEditing = !!taskData.id;
    const parentId = taskData.parentId === "none" ? null : taskData.parentId;

    if (isEditing) {
      const res = await fetch(`/api/tasks/${taskData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: taskData.name,
          category: taskData.category,
          assigned: taskData.assigned,
          startDate: taskData.startDate,
          days: taskData.days,
          progress: taskData.progress,
          isMilestone: taskData.isMilestone,
          color: taskData.color,
          parentId,
          dependencies: taskData.dependencies,
          collapsed: taskData.collapsed,
        }),
      });

      if (res.ok && parentId) {
        const updatedTasks = currentTasks.map((t) =>
          t.id === taskData.id ? { ...t, ...taskData, parentId } : t
        );
        const parentUpdates = recalcParent(updatedTasks, parentId);
        if (parentUpdates) {
          await fetch(`/api/tasks/${parentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parentUpdates),
          });
        }
      }
    } else {
      const sortOrder = currentTasks.length;
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskData,
          projectId: currentProjectId,
          parentId,
          sortOrder,
        }),
      });

      if (res.ok && parentId) {
        const newTask = await res.json();
        const updatedTasks = [...currentTasks, newTask];
        const parentUpdates = recalcParent(updatedTasks, parentId);
        if (parentUpdates) {
          await fetch(`/api/tasks/${parentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parentUpdates),
          });
        }
      }
    }
    await loadProjects();
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm("Delete this task?")) return;

    const task = currentTasks.find((t) => t.id === taskId);
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });

    if (task?.parentId) {
      const remaining = currentTasks.filter(
        (t) => t.id !== taskId && t.parentId !== taskId
      );
      const parentUpdates = recalcParent(remaining, task.parentId);
      if (parentUpdates) {
        await fetch(`/api/tasks/${task.parentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parentUpdates),
        });
      }
    }
    await loadProjects();
  }

  async function handleToggleCollapse(taskId: string) {
    const task = currentTasks.find((t) => t.id === taskId);
    if (!task) return;
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collapsed: !task.collapsed }),
    });
    await loadProjects();
  }

  function openEditTask(taskId: string) {
    const task = currentTasks.find((t) => t.id === taskId);
    if (task) {
      setEditingTask(task);
      setIsMilestone(false);
      setTaskModalOpen(true);
    }
  }

  function openAddTask() {
    setEditingTask(null);
    setIsMilestone(false);
    setTaskModalOpen(true);
  }

  function openAddMilestone() {
    setEditingTask(null);
    setIsMilestone(true);
    setTaskModalOpen(true);
  }

  function handleExportJSON() {
    const blob = new Blob([JSON.stringify({ projects }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `SESG_Gantt_Data_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  }

  function handleExportCSV() {
    if (!currentProject) return;
    let csv =
      "Task #,Task Name,Category,Assigned To,Progress %,Start Date,Days,Dependencies,Milestone,Parent Task\n";
    displayList.forEach((item) => {
      const t = item.task;
      const deps = t.dependencies.map((dId) => idToNumber[dId] || "").join(";");
      const parent = t.parentId ? idToNumber[t.parentId] || "" : "";
      csv += `${item.displayNumber},"${t.name}","${t.category}","${t.assigned}",${t.progress},${t.startDate},${t.days},"${deps}",${t.isMilestone},"${parent}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${currentProject.name.replace(/\s+/g, "_")}_Gantt_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  // Loading states
  if (authenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[#8899A6]">Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <LoginGate
        onAuthenticated={() => {
          setAuthenticated(true);
          loadProjects();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#111416]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#3A4149] bg-[#1A1D21] px-6 py-3">
        <div className="flex items-center gap-4">
          <img src="/sesg-logo.svg" alt="SESG" className="h-8" />
          <h1 className="text-lg font-semibold text-[#6CC5C0]">
            Project Gantt
          </h1>
          <ProjectSelector
            projects={projects}
            currentProjectId={currentProjectId}
            onSelect={setCurrentProjectId}
          />
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as "detailed" | "highlevel")}
          >
            <TabsList className="bg-[#262B30]">
              <TabsTrigger
                value="detailed"
                className="data-[state=active]:bg-[#6CC5C0] data-[state=active]:text-[#1A1D21]"
              >
                Detailed
              </TabsTrigger>
              <TabsTrigger
                value="highlevel"
                className="data-[state=active]:bg-[#6CC5C0] data-[state=active]:text-[#1A1D21]"
              >
                High Level
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProjectModalOpen(true)}
            className="border-[#3A4149] text-[#8899A6] hover:bg-[#262B30]"
          >
            + Project
          </Button>
          {currentProject && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteProject}
              className="border-[#3A4149] text-red-400 hover:bg-red-900/20"
            >
              Delete Project
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {loading && projects.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-[#8899A6]">
            Loading projects...
          </div>
        ) : view === "detailed" ? (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2">
              <Button
                onClick={openAddTask}
                className="bg-[#6CC5C0] text-[#1A1D21] hover:bg-[#4DA8A3]"
                size="sm"
              >
                + Add Task
              </Button>
              <Button
                onClick={openAddMilestone}
                variant="outline"
                size="sm"
                className="border-[#A78BFA] text-[#A78BFA] hover:bg-[#A78BFA]/10"
              >
                + Milestone
              </Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="border-[#3A4149] text-[#8899A6] hover:bg-[#262B30]"
              >
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                className="border-[#3A4149] text-[#8899A6] hover:bg-[#262B30]"
              >
                Export JSON
              </Button>
            </div>

            {/* Task table + Gantt side by side */}
            <div className="flex gap-0 overflow-hidden rounded-lg border border-[#3A4149]">
              <div className="min-w-[600px] flex-none overflow-auto border-r border-[#3A4149] bg-[#1A1D21]">
                <TaskTable
                  displayItems={displayList}
                  idToNumber={idToNumber}
                  onEdit={openEditTask}
                  onDelete={handleDeleteTask}
                  onToggleCollapse={handleToggleCollapse}
                />
              </div>
              <div className="flex-1 overflow-auto bg-[#1A1D21]">
                <GanttTimeline
                  displayItems={displayList}
                  onEditTask={openEditTask}
                />
              </div>
            </div>
          </div>
        ) : (
          <HighLevelView
            projects={projects}
            onSelectProject={(id) => {
              setCurrentProjectId(id);
              setView("detailed");
            }}
          />
        )}
      </main>

      {/* Modals */}
      <ProjectModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSave={handleCreateProject}
      />
      <TaskModal
        open={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        editingTask={editingTask}
        tasks={currentTasks}
        isMilestone={isMilestone}
      />
    </div>
  );
}
