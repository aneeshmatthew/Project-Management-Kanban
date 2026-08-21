"use client";

import { useDraggable } from "@dnd-kit/core";
import { cva } from "class-variance-authority";

const priorityDot = cva("h-1.5 w-1.5 shrink-0 rounded-full", {
  variants: {
    priority: {
      NONE: "bg-priority-none",
      LOW: "bg-priority-low",
      MEDIUM: "bg-priority-medium",
      HIGH: "bg-priority-high",
      URGENT: "bg-priority-urgent",
    },
  },
});

export interface PlanningCardData {
  id: string;
  title: string;
  priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  projectKey: string;
  taskNumber: number;
  assignee: { name: string | null } | null;
  epic: { name: string; color: string | null } | null;
}

export function PlanningCard({ task }: { task: PlanningCardData }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex cursor-grab items-center gap-2 rounded-md border border-border bg-panel px-2.5 py-2 active:cursor-grabbing ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      <span className={priorityDot({ priority: task.priority })} />
      <span className="flex-1 truncate text-sm text-ink">{task.title}</span>
      {task.epic && (
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium text-canvas"
          style={{ backgroundColor: task.epic.color ?? "#5B8DEF" }}
        >
          {task.epic.name}
        </span>
      )}
      <span className="shrink-0 font-mono text-[10px] text-muted">
        {task.projectKey}-{task.taskNumber}
      </span>
      {task.assignee && (
        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-border font-mono text-[9px] text-ink">
          {task.assignee.name?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}
