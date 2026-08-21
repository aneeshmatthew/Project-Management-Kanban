"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import { TaskCard, type TaskCardData } from "./task-card";

export interface ColumnData {
  id: string;
  name: string;
  wipLimit: number | null;
  tasks: TaskCardData[];
}

export function Column({ column }: { column: ColumnData }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const overLimit = column.wipLimit != null && column.tasks.length > column.wipLimit;

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
        className={`flex min-h-[120px] flex-1 flex-col gap-2 p-2 transition-colors ${
          isOver ? "bg-panel/60" : ""
        }`}
      >
        <SortableContext
          items={column.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence initial={false}>
            {column.tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>
    </div>
  );
}
