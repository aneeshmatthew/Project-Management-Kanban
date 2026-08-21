"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { generateKeyBetween } from "fractional-indexing";
import { AnimatePresence, motion } from "framer-motion";
import { Column, type ColumnData } from "./column";
import { TaskCard } from "./task-card";
import { useMoveTask } from "@/hooks/use-move-task";
import { useBoardStore } from "@/stores/board-store";

export function Board({
  projectId,
  boardId,
  columns,
}: {
  projectId: string;
  boardId: string;
  columns: ColumnData[];
}) {
  const moveTask = useMoveTask(projectId, boardId);
  const dragTarget = useBoardStore((s) => s.dragTarget);
  const setDragTarget = useBoardStore((s) => s.setDragTarget);
  const setActiveTask = useBoardStore((s) => s.setActiveTask);
  const activeTaskId = useBoardStore((s) => s.activeTaskId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const taskLookup = useMemo(() => {
    const map = new Map<string, { task: (typeof columns)[number]["tasks"][number]; columnId: string }>();
    for (const col of columns) {
      for (const task of col.tasks) map.set(task.id, { task, columnId: col.id });
    }
    return map;
  }, [columns]);

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const overEntry = taskLookup.get(String(over.id));
    const targetColumnId = overEntry?.columnId ?? String(over.id); // over.id may be a column (empty drop zone) or a task

    const columnTasks = columns.find((c) => c.id === targetColumnId)?.tasks ?? [];
    const overIndex = columnTasks.findIndex((t) => t.id === over.id);

    const before = overIndex > 0 ? columnTasks[overIndex - 1].position : null;
    const after = overIndex >= 0 ? columnTasks[overIndex].position : null;
    const preview = generateKeyBetween(before, after);

    setDragTarget({
      columnId: targetColumnId,
      beforePosition: before,
      afterPosition: after,
      previewPosition: preview,
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active } = event;
    setActiveTask(null);

    if (!dragTarget) return;

    moveTask.mutate({
      projectId,
      taskId: String(active.id),
      toColumnId: dragTarget.columnId,
      beforePosition: dragTarget.beforePosition,
      afterPosition: dragTarget.afterPosition,
    });

    setDragTarget(null);
  }

  const activeTask = activeTaskId ? taskLookup.get(activeTaskId)?.task : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto p-4">
        {columns.map((col) => (
          <Column key={col.id} column={col} />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} /> : null}
      </DragOverlay>

      {/* Signature element: shows the actual fractional-index key that
          task.move will write on drop — a small, honest reveal of the
          mechanism, not decoration. */}
      <AnimatePresence>
        {dragTarget?.previewPosition && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded border border-border bg-panel px-2.5 py-1 font-mono text-[11px] text-priority-high shadow-lg"
          >
            position: {dragTarget.previewPosition}
          </motion.div>
        )}
      </AnimatePresence>
    </DndContext>
  );
}
