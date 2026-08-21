"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@repo/ui";

export interface SprintRowData {
  id: string;
  name: string;
  goal: string | null;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
  startDate: string;
  endDate: string;
  taskCount: number;
  totalPoints: number;
}

const STATUS_STYLE: Record<string, string> = {
  PLANNED: "text-muted border-border",
  ACTIVE: "text-priority-medium border-priority-medium",
  COMPLETED: "text-priority-low border-priority-low",
};

export function SprintRow({
  projectId,
  sprint,
}: {
  projectId: string;
  sprint: SprintRowData;
}) {
  const router = useRouter();

  const start = trpc.sprint.start.useMutation({ onSuccess: () => router.refresh() });
  const complete = trpc.sprint.complete.useMutation({ onSuccess: () => router.refresh() });

  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-ink">{sprint.name}</h3>
            <span
              className={`rounded border px-2 py-0.5 font-mono text-[10px] ${STATUS_STYLE[sprint.status]}`}
            >
              {sprint.status}
            </span>
          </div>
          {sprint.goal && <p className="mt-1 max-w-md text-xs text-muted">{sprint.goal}</p>}
          <p className="mt-2 font-mono text-[11px] text-muted">
            {sprint.startDate} – {sprint.endDate} · {sprint.taskCount} task
            {sprint.taskCount === 1 ? "" : "s"} · {sprint.totalPoints} pts
          </p>
        </div>

        <div className="flex gap-2">
          {sprint.status === "PLANNED" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => start.mutate({ projectId, sprintId: sprint.id })}
              disabled={start.isPending}
            >
              Start sprint
            </Button>
          )}
          {sprint.status === "ACTIVE" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => complete.mutate({ projectId, sprintId: sprint.id })}
              disabled={complete.isPending}
            >
              Complete sprint
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
