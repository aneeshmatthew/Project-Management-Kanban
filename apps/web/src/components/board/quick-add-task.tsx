"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useCreateTask } from "@/hooks/use-create-task";

export function QuickAddTask({
  projectId,
  boardId,
  columnId,
  lastPosition,
}: {
  projectId: string;
  boardId: string;
  columnId: string;
  /** Position of the last task in this column's true (unfiltered) list, or null if empty — new tasks are appended at the bottom. */
  lastPosition: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask(projectId, boardId);

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setIsOpen(false);
      return;
    }
    createTask.mutate({
      projectId,
      columnId,
      title: trimmed,
      afterPosition: lastPosition,
    });
    setTitle("");
    // Stay open and refocus — quick-add is for adding several tasks in a
    // row without re-clicking each time, matching the pattern in Trello
    // and Linear's inline add.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-muted hover:bg-panel hover:text-ink"
      >
        <Plus size={13} />
        Add task
      </button>
    );
  }

  return (
    <div className="rounded-md border border-priority-medium bg-panel p-1.5">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            setTitle("");
            setIsOpen(false);
          }
        }}
        onBlur={() => {
          if (!title.trim()) setIsOpen(false);
        }}
        placeholder="Task title…"
        className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
      />
      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted">
        <span>Enter to add, keep typing for the next one</span>
        <button
          onClick={() => {
            setTitle("");
            setIsOpen(false);
          }}
          className="ml-auto hover:text-ink"
          aria-label="Cancel"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
