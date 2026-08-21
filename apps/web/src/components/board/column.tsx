"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import { TaskCard, type TaskCardData } from "./task-card";
import { useBoardStore } from "@/stores/board-store";

export interface ColumnData {
  id: string;
  name: string;
  wipLimit: number | null;
  tasks: TaskCardData[];
}

/**
 * `column` always carries the true, unfiltered set of tasks — WIP limit
 * math must never be computed from a label-filtered view, or a filtered
 * board could silently let someone drop past a limit that's only
 * "invisible" because the cards pushing it over are hidden right now.
 * `visibleTasks` is the (possibly filtered) list actually rendered.
 */
export function Column({
  column,
  visibleTasks,
}: {
  column: ColumnData;
  visibleTasks: TaskCardData[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const activeTaskId = useBoardStore((s) => s.activeTaskId);
  const overLimit = column.wipLimit != null && column.tasks.length > column.wipLimit;

  // A drop only increases this column's true count if the dragged task
  // doesn't already live here (a same-column reorder never changes it).
  const isReorderWithinColumn = column.tasks.some((t) => t.id === activeTaskId);
  const wouldExceedLimit =
    column.wipLimit != null &&
    !isReorderWithinColumn &&
    activeTaskId != null &&
    column.tasks.length >= column.wipLimit;

  const isBlocked = isOver && wouldExceedLimit;

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-canvas">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <h3 className="text-sm font-medium text-ink">{column.name}</h3>
        <span
          className={`font-mono text-xs ${overLimit ? "text-priority-urgent" : "text-muted"}`}
        >
          {column.tasks.length}
          {column.wipLimit != null && `/${column.wipLimit}`}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-1 flex-col gap-2 rounded-b-lg border-2 border-transparent p-2 transition-colors ${
          isBlocked
            ? "cursor-not-allowed border-priority-urgent/60 bg-priority-urgent/10"
            : isOver
              ? "bg-panel/60"
              : ""
        }`}
      >
        <SortableContext
          items={visibleTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence initial={false}>
            {visibleTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>
    </div>
  );
}
