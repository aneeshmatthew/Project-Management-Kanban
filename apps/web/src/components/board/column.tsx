"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import { TaskCard, type TaskCardData } from "./task-card";
import { ColumnHeader } from "./column-header";
import { QuickAddTask } from "./quick-add-task";
import { useBoardStore } from "@/stores/board-store";

export interface ColumnData {
  id: string;
  name: string;
  wipLimit: number | null;
  position: string;
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
  projectId,
  boardId,
  column,
  visibleTasks,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
}: {
  projectId: string;
  boardId: string;
  column: ColumnData;
  visibleTasks: TaskCardData[];
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const activeTaskId = useBoardStore((s) => s.activeTaskId);

  // A drop only increases this column's true count if the dragged task
  // doesn't already live here (a same-column reorder never changes it).
  const isReorderWithinColumn = column.tasks.some((t) => t.id === activeTaskId);
  const wouldExceedLimit =
    column.wipLimit != null &&
    !isReorderWithinColumn &&
    activeTaskId != null &&
    column.tasks.length >= column.wipLimit;

  const isBlocked = isOver && wouldExceedLimit;

  // Quick-add must respect the same limit as drag-and-drop — otherwise
  // typing a title would be a silent backdoor around the exact rule
  // handleDragEnd just finished blocking.
  const isAtWipLimit = column.wipLimit != null && column.tasks.length >= column.wipLimit;

  // True (unfiltered) last position in the column, so a new task always
  // lands at the real bottom regardless of any active label filter.
  const lastPosition = column.tasks.length > 0 ? column.tasks[column.tasks.length - 1]?.position ?? null : null;

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-canvas">
      <ColumnHeader
        projectId={projectId}
        columnId={column.id}
        name={column.name}
        wipLimit={column.wipLimit}
        taskCount={column.tasks.length}
        canMoveLeft={canMoveLeft}
        canMoveRight={canMoveRight}
        onMoveLeft={onMoveLeft}
        onMoveRight={onMoveRight}
      />

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

        {isAtWipLimit ? (
          <p className="px-2 py-1.5 font-mono text-[10px] text-muted">
            At WIP limit — move or finish a task to add another
          </p>
        ) : (
          <QuickAddTask
            projectId={projectId}
            boardId={boardId}
            columnId={column.id}
            lastPosition={lastPosition}
          />
        )}
      </div>
    </div>
  );
}
