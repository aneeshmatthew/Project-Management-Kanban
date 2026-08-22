"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Plus } from "lucide-react";
import { Column, type ColumnData } from "./column";
import { TaskCard, type TaskCardData } from "./task-card";
import { useMoveTask } from "@/hooks/use-move-task";
import { useBoardStore } from "@/stores/board-store";
import { labelColor } from "@/lib/labels";
import { trpc } from "@/lib/trpc-client";

export function Board({
  projectId,
  boardId,
  columns,
}: {
  projectId: string;
  boardId: string;
  columns: ColumnData[];
}) {
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const router = useRouter();
  const moveTask = useMoveTask(projectId, boardId);
  const moveColumn = trpc.column.move.useMutation({ onSuccess: () => router.refresh() });
  const createColumn = trpc.column.create.useMutation({ onSuccess: () => router.refresh() });
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const dragTarget = useBoardStore((s) => s.dragTarget);
  const setDragTarget = useBoardStore((s) => s.setDragTarget);
  const setActiveTask = useBoardStore((s) => s.setActiveTask);
  const activeTaskId = useBoardStore((s) => s.activeTaskId);
  const labelFilters = useBoardStore((s) => s.labelFilters);
  const toggleLabelFilter = useBoardStore((s) => s.toggleLabelFilter);
  const clearLabelFilters = useBoardStore((s) => s.clearLabelFilters);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  // All labels present anywhere on the board — the filter bar's option set
  // stays stable even once a filter is applied and cards disappear.
  const allLabels = useMemo(() => {
    const set = new Set<string>();
    for (const col of columns) {
      for (const task of col.tasks) {
        for (const label of task.labels) set.add(label);
      }
    }
    return Array.from(set).sort();
  }, [columns]);

  // `columns` stays the source of truth (full task lists, used for WIP
  // math and lookups). `visibleTasksByColumn` is the label-filtered view
  // actually rendered — kept separate so filtering can never distort a
  // WIP limit check.
  const visibleTasksByColumn = useMemo(() => {
    const map = new Map<string, TaskCardData[]>();
    for (const col of columns) {
      map.set(
        col.id,
        labelFilters.length === 0
          ? col.tasks
          : col.tasks.filter((t) => t.labels.some((l) => labelFilters.includes(l)))
      );
    }
    return map;
  }, [columns, labelFilters]);

  // Maps every task id -> its true current column id, built from the full
  // (unfiltered) data so drag interactions always resolve correctly.
  const taskColumnLookup = useMemo(() => {
    const map = new Map<string, { task: TaskCardData; columnId: string }>();
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

    const overEntry = taskColumnLookup.get(String(over.id));
    const targetColumnId = overEntry?.columnId ?? String(over.id); // over.id may be a column (empty drop zone) or a task

    const targetColumn = columns.find((c) => c.id === targetColumnId);
    const isReorderWithinColumn = targetColumn?.tasks.some((t) => t.id === active.id);
    const wouldExceedLimit =
      targetColumn?.wipLimit != null &&
      !isReorderWithinColumn &&
      targetColumn.tasks.length >= targetColumn.wipLimit;

    if (wouldExceedLimit) {
      // Suppress the position-ghost chip while hovering a blocked column so
      // the two visual signals (red column vs. "here's your new position")
      // never contradict each other.
      setDragTarget(null);
      return;
    }

    const visibleTasks = visibleTasksByColumn.get(targetColumnId) ?? [];
    const overIndex = visibleTasks.findIndex((t) => t.id === over.id);

    const before = overIndex > 0 ? (visibleTasks[overIndex - 1]?.position ?? null) : null;
    const after = overIndex >= 0 ? (visibleTasks[overIndex]?.position ?? null) : null;
    const preview = generateKeyBetween(before, after);

    setDragTarget({
      columnId: targetColumnId,
      beforePosition: before,
      afterPosition: after,
      previewPosition: preview,
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      setDragTarget(null);
      return;
    }

    // Resolve the target column from the drop event itself rather than
    // from `dragTarget` — dragTarget is intentionally nulled while
    // hovering a blocked column (see handleDragOver above), so relying on
    // it here would silently swallow the drop instead of showing the
    // WIP-limit toast.
    const overEntry = taskColumnLookup.get(String(over.id));
    const targetColumnId = overEntry?.columnId ?? String(over.id);
    const targetColumn = columns.find((c) => c.id === targetColumnId);
    const isReorderWithinColumn = targetColumn?.tasks.some((t) => t.id === active.id);

    if (
      targetColumn?.wipLimit != null &&
      !isReorderWithinColumn &&
      targetColumn.tasks.length >= targetColumn.wipLimit
    ) {
      setBlockedMessage(
        `${targetColumn.name} is at its WIP limit (${targetColumn.wipLimit}) — move or finish a task there first.`
      );
      setDragTarget(null);
      return;
    }

    if (dragTarget) {
      moveTask.mutate({
        projectId,
        taskId: String(active.id),
        toColumnId: dragTarget.columnId,
        beforePosition: dragTarget.beforePosition,
        afterPosition: dragTarget.afterPosition,
      });
    }

    setDragTarget(null);
  }

  const activeTask = activeTaskId ? taskColumnLookup.get(activeTaskId)?.task : null;

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.position.localeCompare(b.position)),
    [columns]
  );

  function handleMoveColumnLeft(index: number) {
    if (index <= 0) return;
    const target = sortedColumns[index];
    const before = index >= 2 ? sortedColumns[index - 2]?.position ?? null : null;
    const after = sortedColumns[index - 1]?.position ?? null;
    if (!target) return;
    moveColumn.mutate({ projectId, columnId: target.id, beforePosition: before, afterPosition: after });
  }

  function handleMoveColumnRight(index: number) {
    if (index >= sortedColumns.length - 1) return;
    const target = sortedColumns[index];
    const before = sortedColumns[index + 1]?.position ?? null;
    const after =
      index + 2 < sortedColumns.length ? sortedColumns[index + 2]?.position ?? null : null;
    if (!target) return;
    moveColumn.mutate({ projectId, columnId: target.id, beforePosition: before, afterPosition: after });
  }

  useEffect(() => {
    if (!blockedMessage) return;
    const timer = setTimeout(() => setBlockedMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [blockedMessage]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {allLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
          <span className="font-mono text-[11px] text-muted">Filter:</span>
          {allLabels.map((label) => {
            const active = labelFilters.includes(label);
            return (
              <button
                key={label}
                onClick={() => toggleLabelFilter(label)}
                className="rounded px-1.5 py-0.5 text-[10px] font-medium transition-opacity"
                style={{
                  backgroundColor: labelColor(label),
                  color: "#0B0E14",
                  opacity: active ? 1 : 0.35,
                }}
              >
                {label}
              </button>
            );
          })}
          {labelFilters.length > 0 && (
            <button
              onClick={clearLabelFilters}
              className="font-mono text-[10px] text-muted underline hover:text-ink"
            >
              clear
            </button>
          )}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto p-4">
        {sortedColumns.map((col, index) => (
          <Column
            key={col.id}
            projectId={projectId}
            boardId={boardId}
            column={col}
            visibleTasks={visibleTasksByColumn.get(col.id) ?? []}
            canMoveLeft={index > 0}
            canMoveRight={index < sortedColumns.length - 1}
            onMoveLeft={() => handleMoveColumnLeft(index)}
            onMoveRight={() => handleMoveColumnRight(index)}
          />
        ))}

        <div className="w-72 shrink-0">
          {isAddingColumn ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newColumnName.trim();
                if (!trimmed) return;
                createColumn.mutate({ projectId, boardId, name: trimmed });
                setNewColumnName("");
                setIsAddingColumn(false);
              }}
              className="rounded-lg border border-border bg-canvas p-2"
            >
              <input
                autoFocus
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onBlur={() => !newColumnName.trim() && setIsAddingColumn(false)}
                placeholder="Column name…"
                className="w-full rounded border border-priority-medium bg-panel px-2 py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none"
              />
            </form>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-sm text-muted hover:border-priority-medium hover:text-ink"
            >
              <Plus size={14} />
              Add column
            </button>
          )}
        </div>
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

      <AnimatePresence>
        {blockedMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none fixed bottom-16 left-1/2 -translate-x-1/2 rounded border border-priority-urgent/60 bg-panel px-3 py-1.5 text-xs text-priority-urgent shadow-lg"
          >
            {blockedMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </DndContext>
  );
}
