"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { labelColor } from "@/lib/labels";
import { useBoardStore } from "@/stores/board-store";

type SortKey = "key" | "title" | "status" | "priority" | "assignee" | "points" | "due";
type SortDir = "asc" | "desc";

const PRIORITY_RANK: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  NONE: 0,
};

export function TaskTable({
  projectId,
  projectKey,
}: {
  projectId: string;
  projectKey: string;
}) {
  const { data: rawTasks, isLoading } = trpc.task.listAllForProject.useQuery({ projectId });
  const openTask = useBoardStore((s) => s.openTask);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("key");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const rows = useMemo(() => {
    if (!rawTasks) return [];

    const filtered = search.trim()
      ? rawTasks.filter((t) => t.title.toLowerCase().includes(search.trim().toLowerCase()))
      : rawTasks;

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "key":
          cmp = a.number - b.number;
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "status":
          cmp = (a.column?.name ?? "").localeCompare(b.column?.name ?? "");
          break;
        case "priority":
          cmp = (PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0);
          break;
        case "assignee":
          cmp = (a.assignee?.name ?? "").localeCompare(b.assignee?.name ?? "");
          break;
        case "points":
          cmp = (a.storyPoints ?? -1) - (b.storyPoints ?? -1);
          break;
        case "due":
          cmp = (a.dueDate ? new Date(a.dueDate).getTime() : 0) -
                (b.dueDate ? new Date(b.dueDate).getTime() : 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [rawTasks, search, sortKey, sortDir]);

  if (isLoading) {
    return <p className="p-4 font-mono text-sm text-muted">Loading…</p>;
  }

  return (
    <div className="p-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search tasks…"
        className="mb-3 w-full max-w-xs rounded-md border border-border bg-panel px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-priority-medium"
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-panel text-left text-[11px] uppercase tracking-wide text-muted">
              <SortableHeader label="Key" sortKey="key" active={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableHeader label="Title" sortKey="title" active={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableHeader label="Status" sortKey="status" active={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableHeader label="Priority" sortKey="priority" active={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableHeader label="Assignee" sortKey="assignee" active={sortKey} dir={sortDir} onClick={toggleSort} />
              <th className="px-3 py-2 font-medium">Epic</th>
              <SortableHeader label="Points" sortKey="points" active={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableHeader label="Due" sortKey="due" active={sortKey} dir={sortDir} onClick={toggleSort} />
              <th className="px-3 py-2 font-medium">Labels</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((task) => (
              <tr
                key={task.id}
                onClick={() => openTask(task.id)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-panel/60"
              >
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted">
                  {projectKey}-{task.number}
                </td>
                <td className="px-3 py-2 text-ink">{task.title}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                  {task.column?.name ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                  {task.priority}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                  {task.assignee?.name ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">
                  {task.epic ? (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-canvas"
                      style={{ backgroundColor: task.epic.color ?? "#5B8DEF" }}
                    >
                      {task.epic.name}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted">
                  {task.storyPoints ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {task.labels.map((label) => (
                      <span
                        key={label}
                        className="rounded px-1.5 py-0.5 text-[9px] font-medium text-canvas"
                        style={{ backgroundColor: labelColor(label) }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center font-mono text-xs text-muted">
                  No tasks match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  active,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
}) {
  const isActive = active === sortKey;
  const Icon = !isActive ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      onClick={() => onClick(sortKey)}
      className="cursor-pointer select-none whitespace-nowrap px-3 py-2 font-medium hover:text-ink"
    >
      <span className="flex items-center gap-1">
        {label}
        <Icon size={11} className={isActive ? "text-ink" : "text-muted/50"} />
      </span>
    </th>
  );
}
