"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Settings2, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc-client";

export function ColumnHeader({
  projectId,
  columnId,
  name,
  wipLimit,
  taskCount,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
}: {
  projectId: string;
  columnId: string;
  name: string;
  wipLimit: number | null;
  taskCount: number;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);
  const [showSettings, setShowSettings] = useState(false);
  const [wipDraft, setWipDraft] = useState(wipLimit?.toString() ?? "");

  const refresh = () => router.refresh();

  const rename = trpc.column.rename.useMutation({ onSuccess: refresh });
  const setWip = trpc.column.setWipLimit.useMutation({ onSuccess: refresh });
  const remove = trpc.column.remove.useMutation({ onSuccess: refresh });

  const overLimit = wipLimit != null && taskCount > wipLimit;

  function commitName() {
    setIsEditingName(false);
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === name) {
      setNameDraft(name);
      return;
    }
    rename.mutate({ projectId, columnId, name: trimmed });
  }

  function commitWip() {
    const value = wipDraft.trim();
    setWip.mutate({
      projectId,
      columnId,
      wipLimit: value === "" ? null : Math.max(1, Number(value)),
    });
  }

  function handleDelete() {
    const warning =
      taskCount > 0
        ? `Delete "${name}"? This will also delete its ${taskCount} task${taskCount === 1 ? "" : "s"}. This can't be undone.`
        : `Delete "${name}"? This can't be undone.`;
    if (window.confirm(warning)) {
      remove.mutate({ projectId, columnId });
    }
  }

  return (
    <div className="border-b border-border">
      <div className="flex items-center justify-between px-3 py-2.5">
        <button
          onClick={onMoveLeft}
          disabled={!canMoveLeft}
          className="text-muted hover:text-ink disabled:opacity-20"
          aria-label="Move column left"
        >
          <ChevronLeft size={14} />
        </button>

        {isEditingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === "Enter" && commitName()}
            className="mx-1 w-full rounded border border-priority-medium bg-canvas px-1 py-0.5 text-sm text-ink"
          />
        ) : (
          <h3
            onClick={() => setIsEditingName(true)}
            className="mx-1 flex-1 cursor-text truncate text-sm font-medium text-ink"
            title="Click to rename"
          >
            {name}
          </h3>
        )}

        <span
          className={`shrink-0 font-mono text-xs ${overLimit ? "text-priority-urgent" : "text-muted"}`}
        >
          {taskCount}
          {wipLimit != null && `/${wipLimit}`}
        </span>

        <button
          onClick={() => setShowSettings((s) => !s)}
          className="ml-1 text-muted hover:text-ink"
          aria-label="Column settings"
        >
          <Settings2 size={13} />
        </button>

        <button
          onClick={onMoveRight}
          disabled={!canMoveRight}
          className="ml-1 text-muted hover:text-ink disabled:opacity-20"
          aria-label="Move column right"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {showSettings && (
        <div className="flex items-center gap-2 border-t border-border bg-panel px-3 py-2">
          <label className="flex items-center gap-1.5 text-[11px] text-muted">
            WIP limit
            <input
              type="number"
              min={1}
              value={wipDraft}
              onChange={(e) => setWipDraft(e.target.value)}
              onBlur={commitWip}
              placeholder="—"
              className="w-14 rounded border border-border bg-canvas px-1.5 py-0.5 font-mono text-xs text-ink"
            />
          </label>
          <button
            onClick={handleDelete}
            className="ml-auto flex items-center gap-1 text-[11px] text-priority-urgent hover:opacity-80"
          >
            <Trash2 size={12} />
            Delete column
          </button>
        </div>
      )}
    </div>
  );
}
