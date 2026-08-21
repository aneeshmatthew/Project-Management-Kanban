"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { PlanningCard, type PlanningCardData } from "./planning-card";
import { useAssignSprint } from "@/hooks/use-assign-sprint";

export interface PlanningSection {
  /** null id = backlog */
  id: string | null;
  name: string;
  subtitle?: string;
  tasks: PlanningCardData[];
}

export function PlanningBoard({
  projectId,
  sections,
}: {
  projectId: string;
  sections: PlanningSection[];
}) {
  const assignSprint = useAssignSprint(projectId);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const taskLookup = useMemo(() => {
    const map = new Map<string, PlanningCardData>();
    for (const section of sections) {
      for (const task of section.tasks) map.set(task.id, task);
    }
    return map;
  }, [sections]);

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTaskId(null);
    if (!over) return;

    const targetSprintId = over.id === "backlog" ? null : String(over.id);

    // No-op if dropped back in its current section.
    const currentSection = sections.find((s) =>
      s.tasks.some((t) => t.id === active.id)
    );
    const currentSprintId = currentSection?.id ?? null;
    if (currentSprintId === targetSprintId) return;

    assignSprint.mutate({
      projectId,
      taskId: String(active.id),
      sprintId: targetSprintId,
    });
  }

  const activeTask = activeTaskId ? taskLookup.get(activeTaskId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4">
        {sections.map((section) => (
          <PlanningSectionColumn key={section.id ?? "backlog"} section={section} />
        ))}
      </div>

      <DragOverlay>{activeTask ? <PlanningCard task={activeTask} /> : null}</DragOverlay>
    </DndContext>
  );
}

function PlanningSectionColumn({ section }: { section: PlanningSection }) {
  const { setNodeRef, isOver } = useDroppable({ id: section.id ?? "backlog" });

  return (
    <div className="rounded-lg border border-border bg-canvas">
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-medium text-ink">{section.name}</h3>
        {section.subtitle && (
          <p className="font-mono text-[11px] text-muted">{section.subtitle}</p>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[64px] flex-col gap-1.5 p-2 transition-colors ${
          isOver ? "bg-panel/60" : ""
        }`}
      >
        {section.tasks.map((task) => (
          <PlanningCard key={task.id} task={task} />
        ))}
        {section.tasks.length === 0 && (
          <p className="p-2 font-mono text-xs text-muted">Drop tasks here</p>
        )}
      </div>
    </div>
  );
}
