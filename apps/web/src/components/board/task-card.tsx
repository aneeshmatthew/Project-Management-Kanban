"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { cva } from "class-variance-authority";
import { useBoardStore } from "@/stores/board-store";

const priorityBar = cva("absolute left-0 top-0 h-full w-1 rounded-l-md", {
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

export interface TaskCardData {
  id: string;
  title: string;
  priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  projectKey: string;
  taskNumber: number;
  assignee: { name: string | null; avatarUrl: string | null } | null;
  owner: { name: string | null } | null;
  epic: { name: string; color: string | null } | null;
  storyPoints: number | null;
  dueDate: string | null;
  commentCount: number;
}

export function TaskCard({ task }: { task: TaskCardData }) {
  const openTask = useBoardStore((s) => s.openTask);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      onClick={() => openTask(task.id)}
      className={`relative cursor-grab overflow-hidden rounded-md border border-border bg-panel p-3 pl-4 shadow-sm active:cursor-grabbing ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      <div className={priorityBar({ priority: task.priority })} />

      {task.epic && (
        <span
          className="mb-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-canvas"
          style={{ backgroundColor: task.epic.color ?? "#5B8DEF" }}
        >
          {task.epic.name}
        </span>
      )}

      <p className="text-sm font-medium leading-snug text-ink">{task.title}</p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs text-muted">
            {task.projectKey}-{task.taskNumber}
          </span>
          {task.storyPoints != null && (
            <span className="font-mono text-[10px] text-muted">{task.storyPoints} pt</span>
          )}
          {task.dueDate && (
            <span className="font-mono text-[10px] text-muted">Due {task.dueDate}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {task.commentCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <MessageSquare size={12} />
              {task.commentCount}
            </span>
          )}
          {task.assignee && (
            <div
              title={
                task.owner?.name && task.owner.name !== task.assignee.name
                  ? `${task.assignee.name} (owner: ${task.owner.name})`
                  : task.assignee.name ?? undefined
              }
              className="flex h-5 w-5 items-center justify-center rounded-full bg-border font-mono text-[10px] text-ink"
            >
              {task.assignee.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
