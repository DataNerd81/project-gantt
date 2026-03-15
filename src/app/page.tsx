"use client";

import { useState, useEffect, useCallback } from "react";
import { ProjectData, TaskData } from "@/lib/types";
import { buildDisplayList, buildNumberMap, recalcParent, recalcAllParents } from "@/lib/gantt-utils";
import { generateProjectPDF } from "@/lib/pdf-report";
import { LoginGate } from "@/components/login-gate";
import { ProjectSelector } from "@/components/project-selector";
import { ProjectModal } from "@/components/project-modal";
import { TaskModal } from "@/components/task-modal";
import { ImportModal } from "@/components/import-modal";
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
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data: ProjectData[] = await res.json();
        // Recalculate parent tasks from children and persist any corrections
        for (const project of data) {
          const changes = recalcAllParents(project.tasks || []);
          for (const { id, updates } of changes) {
            fetch(`/api/tasks/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updates),
            });
          }
        }
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
    if (!confirm("Delete this project and all its tasks?")) return;

    await fetch(`/api/projects/${currentProjectId}`, { method: "DELETE" });
    const remaining = projects.filter((p) => p.id !== currentProjectId);

    if (remaining.length > 0) {
      setProjects(remaining);
      setCurrentProjectId(remaining[0]?.id || null);
    } else {
      // Auto-create a new default project when the last one is deleted
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Project", color: "#6CC5C0" }),
      });
      if (res.ok) {
        const project = await res.json();
        setProjects([project]);
        setCurrentProjectId(project.id);
      } else {
        setProjects([]);
        setCurrentProjectId(null);
      }
    }
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

    // Optimistic update: remove task and its children immediately
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== currentProjectId) return p;
        const remaining = p.tasks.filter(
          (t) => t.id !== taskId && t.parentId !== taskId
        );
        // Recalc parent if needed
        if (task?.parentId) {
          const parentUpdates = recalcParent(remaining, task.parentId);
          if (parentUpdates) {
            const parent = remaining.find((t) => t.id === task.parentId);
            if (parent) Object.assign(parent, parentUpdates);
          }
        }
        return { ...p, tasks: remaining };
      })
    );

    // Fire API calls in background
    fetch(`/api/tasks/${taskId}`, { method: "DELETE" }).then(() => {
      if (task?.parentId) {
        const remaining = currentTasks.filter(
          (t) => t.id !== taskId && t.parentId !== taskId
        );
        const parentUpdates = recalcParent(remaining, task.parentId);
        if (parentUpdates) {
          fetch(`/api/tasks/${task.parentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parentUpdates),
          });
        }
      }
    });
  }

  async function handleToggleCollapse(taskId: string) {
    const task = currentTasks.find((t) => t.id === taskId);
    if (!task) return;
    const newCollapsed = !task.collapsed;

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== currentProjectId) return p;
        return {
          ...p,
          tasks: p.tasks.map((t) =>
            t.id === taskId ? { ...t, collapsed: newCollapsed } : t
          ),
        };
      })
    );

    // Fire API in background
    fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collapsed: newCollapsed }),
    });
  }

  async function handleReorder(taskId: string, newIndex: number) {
    const visibleItems = displayList.filter((item) => item.visible);
    const oldIndex = visibleItems.findIndex((item) => item.task.id === taskId);
    if (oldIndex === -1 || oldIndex === newIndex) return;

    // Build the new order
    const reordered = [...visibleItems];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Send updates to the API
    const updates = reordered.map((item, i) => ({
      id: item.task.id,
      sortOrder: i,
      parentId: item.task.parentId,
    }));

    // Also include any hidden (collapsed) items, keeping their relative order
    const hiddenItems = displayList.filter((item) => !item.visible);
    for (const hidden of hiddenItems) {
      const parentIdx = updates.findIndex((u) => u.id === hidden.task.parentId);
      if (parentIdx !== -1) {
        updates.push({
          id: hidden.task.id,
          sortOrder: updates[parentIdx].sortOrder,
          parentId: hidden.task.parentId,
        });
      }
    }

    // Optimistic update: apply new sort orders to local state immediately
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== currentProjectId) return p;
        const taskMap = new Map(updates.map((u) => [u.id, u.sortOrder]));
        return {
          ...p,
          tasks: p.tasks.map((t) =>
            taskMap.has(t.id) ? { ...t, sortOrder: taskMap.get(t.id)! } : t
          ),
        };
      })
    );

    // Fire API in background (no await)
    fetch("/api/tasks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
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
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3A4149] bg-[#1A1D21] px-3 py-2 md:px-6 md:py-3">
        <div className="flex items-center gap-2 md:gap-4">
          <img src="/sesg-logo.svg" alt="SESG" className="h-6 md:h-8" />
          <h1 className="hidden text-lg font-semibold text-[#6CC5C0] sm:block">
            Project Gantt
          </h1>
          <ProjectSelector
            projects={projects}
            currentProjectId={currentProjectId}
            onSelect={setCurrentProjectId}
            onRename={async (id, newName) => {
              await fetch(`/api/projects/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName }),
              });
              loadProjects();
            }}
          />
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as "detailed" | "highlevel")}
          >
            <TabsList className="bg-[#262B30]">
              <TabsTrigger
                value="detailed"
                className="px-2 text-xs data-[state=active]:bg-[#6CC5C0] data-[state=active]:text-[#1A1D21] md:px-3 md:text-sm"
              >
                Detailed
              </TabsTrigger>
              <TabsTrigger
                value="highlevel"
                className="px-2 text-xs data-[state=active]:bg-[#6CC5C0] data-[state=active]:text-[#1A1D21] md:px-3 md:text-sm"
              >
                High Level
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProjectModalOpen(true)}
            className="border-[#3A4149] text-xs text-[#8899A6] hover:bg-[#262B30] md:text-sm"
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
      <main className="p-2 md:p-6">
        {loading && projects.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-[#8899A6]">
            Loading projects...
          </div>
        ) : view === "detailed" ? (
          <div className="space-y-3 md:space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
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
                onClick={() => setImportModalOpen(true)}
                className="border-[#3A4149] text-xs text-[#6CC5C0] hover:bg-[#262B30]"
              >
                Import CSV
              </Button>
              {currentProject && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateProjectPDF(currentProject)}
                  className="border-[#3A4149] text-xs text-[#8899A6] hover:bg-[#262B30]"
                >
                  PDF
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="border-[#3A4149] text-xs text-[#8899A6] hover:bg-[#262B30]"
              >
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                className="border-[#3A4149] text-xs text-[#8899A6] hover:bg-[#262B30]"
              >
                JSON
              </Button>
            </div>

            {/* Task table + Gantt: stack on mobile, side-by-side on desktop */}
            <div className="flex max-h-[calc(100vh-180px)] flex-col gap-0 overflow-hidden rounded-lg border border-[#3A4149] lg:flex-row">
              <div className="max-h-[50vh] flex-none overflow-auto border-b border-[#3A4149] bg-[#1A1D21] lg:max-h-none lg:min-w-[600px] lg:border-b-0 lg:border-r">
                <TaskTable
                  displayItems={displayList}
                  idToNumber={idToNumber}
                  onEdit={openEditTask}
                  onDelete={handleDeleteTask}
                  onToggleCollapse={handleToggleCollapse}
                  onReorder={handleReorder}
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
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        projectId={currentProjectId}
        onImported={() => {
          setImportModalOpen(false);
          loadProjects();
        }}
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
