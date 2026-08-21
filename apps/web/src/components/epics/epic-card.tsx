const STATUS_LABEL: Record<string, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export interface EpicCardData {
  id: string;
  name: string;
  description: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "DONE";
  color: string | null;
  owner: { name: string | null } | null;
  targetDate: string | null;
  taskCount: number;
}

export function EpicCard({ epic }: { epic: EpicCardData }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-panel p-4">
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: epic.color ?? "#5B8DEF" }}
      />
      <div className="flex items-start justify-between pl-2">
        <div>
          <h3 className="text-sm font-medium text-ink">{epic.name}</h3>
          {epic.description && (
            <p className="mt-1 max-w-md text-xs text-muted">{epic.description}</p>
          )}
        </div>
        <span className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted">
          {STATUS_LABEL[epic.status]}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 pl-2 font-mono text-[11px] text-muted">
        <span>{epic.taskCount} task{epic.taskCount === 1 ? "" : "s"}</span>
        {epic.owner?.name && <span>Owner: {epic.owner.name}</span>}
        {epic.targetDate && <span>Target: {epic.targetDate}</span>}
      </div>
    </div>
  );
}
