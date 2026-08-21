import { create } from "zustand";

interface DragTarget {
  columnId: string;
  beforePosition: string | null;
  afterPosition: string | null;
  /** The fractional-index key that will be written on drop — drives the "position ghost" chip. */
  previewPosition: string | null;
}

interface BoardState {
  activeTaskId: string | null;
  dragTarget: DragTarget | null;
  assigneeFilter: string | null;
  openTaskId: string | null;

  setActiveTask: (taskId: string | null) => void;
  setDragTarget: (target: DragTarget | null) => void;
  setAssigneeFilter: (userId: string | null) => void;
  openTask: (taskId: string | null) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  activeTaskId: null,
  dragTarget: null,
  assigneeFilter: null,
  openTaskId: null,

  setActiveTask: (taskId) => set({ activeTaskId: taskId }),
  setDragTarget: (target) => set({ dragTarget: target }),
  setAssigneeFilter: (userId) => set({ assigneeFilter: userId }),
  openTask: (taskId) => set({ openTaskId: taskId }),
}));
