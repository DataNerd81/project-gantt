export interface TaskData {
  id: string;
  projectId: string;
  name: string;
  category: string;
  assigned: string | null;
  startDate: string;
  days: number;
  progress: number;
  isMilestone: boolean;
  color: string | null;
  parentId: string | null;
  collapsed: boolean;
  sortOrder: number;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectData {
  id: string;
  name: string;
  color: string;
  tasks: TaskData[];
  createdAt: string;
  updatedAt: string;
}

export interface DisplayItem {
  task: TaskData;
  depth: number;
  displayNumber: string;
  isParent: boolean;
  visible: boolean;
}
