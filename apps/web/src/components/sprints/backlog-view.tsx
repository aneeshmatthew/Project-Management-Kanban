"use client";

import { trpc } from "@/lib/trpc-client";
import { PlanningBoard, type PlanningSection } from "./planning-board";

export function BacklogView({
  projectId,
  projectKey,
}: {
  projectId: string;
  projectKey: string;
}) {
  const { data, isLoading } = trpc.sprint.planningBoard.useQuery({ projectId });

  if (isLoading || !data) {
    return <p className="p-4 font-mono text-sm text-muted">Loading…</p>;
  }

  const sections: PlanningSection[] = [
    {
      id: null,
      name: "Backlog",
      subtitle: `${data.backlog.length} unassigned`,
      tasks: data.backlog.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        projectKey,
        taskNumber: t.number,
        storyPoints: t.storyPoints,
        assignee: t.assignee ? { name: t.assignee.name } : null,
        epic: t.epic ? { name: t.epic.name, color: t.epic.color } : null,
      })),
    },
    ...data.sprints.map((s) => ({
      id: s.id,
      name: s.name,
      subtitle: `${s.status} · ${new Date(s.startDate).toLocaleDateString()} – ${new Date(
        s.endDate
      ).toLocaleDateString()}`,
      tasks: s.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        projectKey,
        taskNumber: t.number,
        storyPoints: t.storyPoints,
        assignee: t.assignee ? { name: t.assignee.name } : null,
        epic: t.epic ? { name: t.epic.name, color: t.epic.color } : null,
      })),
    })),
  ];

  return <PlanningBoard projectId={projectId} sections={sections} />;
}
