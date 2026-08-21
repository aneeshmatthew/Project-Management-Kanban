"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { useBoardStore } from "@/stores/board-store";
import { Button } from "@repo/ui";

export function TaskPanel({ projectId }: { projectId: string }) {
  const openTaskId = useBoardStore((s) => s.openTaskId);
  const openTask = useBoardStore((s) => s.openTask);

  return (
    <AnimatePresence>
      {openTaskId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => openTask(null)}
            className="fixed inset-0 z-40 bg-black/50"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.2 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-border bg-panel"
          >
            <TaskPanelContent
              taskId={openTaskId}
              projectId={projectId}
              onClose={() => openTask(null)}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TaskPanelContent({
  taskId,
  projectId,
  onClose,
}: {
  taskId: string;
  projectId: string;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: task, isLoading } = trpc.task.getById.useQuery({ taskId });
  const { data: members } = trpc.project.listMembers.useQuery({ projectId });
  const { data: epics } = trpc.epic.list.useQuery({ projectId });
  const { data: sprints } = trpc.sprint.list.useQuery({ projectId });

  const invalidate = () => {
    utils.task.getById.invalidate({ taskId });
    utils.board.get.invalidate();
  };

  const setOwner = trpc.task.setOwner.useMutation({ onSuccess: invalidate });
  const setAssignee = trpc.task.assign.useMutation({ onSuccess: invalidate });
  const setEpic = trpc.task.setEpic.useMutation({ onSuccess: invalidate });
  const setSprint = trpc.task.setSprint.useMutation({ onSuccess: invalidate });
  const setTimeline = trpc.task.setTimeline.useMutation({ onSuccess: invalidate });
  const setStoryPoints = trpc.task.setStoryPoints.useMutation({ onSuccess: invalidate });
  const addComment = trpc.task.addComment.useMutation({
    onSuccess: () => {
      setCommentBody("");
      utils.task.getById.invalidate({ taskId });
    },
  });

  const [commentBody, setCommentBody] = useState("");

  if (isLoading || !task) {
    return (
      <div className="p-4">
        <PanelHeader onClose={onClose} />
        <p className="mt-4 font-mono text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PanelHeader onClose={onClose} />

      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-base font-medium text-ink">{task.title}</h2>
        {task.description && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{task.description}</p>
        )}

        {/* --- PM planning fields --- */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Field label="Owner">
            <select
              value={task.ownerId ?? ""}
              onChange={(e) =>
                setOwner.mutate({
                  projectId,
                  taskId,
                  ownerId: e.target.value || null,
                })
              }
              className="w-full rounded-md border border-border bg-canvas px-2 py-1.5 text-sm text-ink"
            >
              <option value="">Unassigned</option>
              {members?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name ?? m.email}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assignee">
            <select
              value={task.assigneeId ?? ""}
              onChange={(e) =>
                setAssignee.mutate({
                  projectId,
                  taskId,
                  assigneeId: e.target.value || null,
                })
              }
              className="w-full rounded-md border border-border bg-canvas px-2 py-1.5 text-sm text-ink"
            >
              <option value="">Unassigned</option>
              {members?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name ?? m.email}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Epic">
            <select
              value={task.epicId ?? ""}
              onChange={(e) =>
                setEpic.mutate({ projectId, taskId, epicId: e.target.value || null })
              }
              className="w-full rounded-md border border-border bg-canvas px-2 py-1.5 text-sm text-ink"
            >
              <option value="">None</option>
              {epics?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sprint">
            <select
              value={task.sprintId ?? ""}
              onChange={(e) =>
                setSprint.mutate({ projectId, taskId, sprintId: e.target.value || null })
              }
              className="w-full rounded-md border border-border bg-canvas px-2 py-1.5 text-sm text-ink"
            >
              <option value="">None</option>
              {sprints?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Story points">
            <input
              type="number"
              min={0}
              max={100}
              defaultValue={task.storyPoints ?? ""}
              onBlur={(e) =>
                setStoryPoints.mutate({
                  projectId,
                  taskId,
                  storyPoints: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="—"
              className="w-full rounded-md border border-border bg-canvas px-2 py-1.5 font-mono text-xs text-ink"
            />
          </Field>

          <Field label="Start date">
            <input
              type="date"
              defaultValue={task.startDate ? toDateInput(task.startDate) : ""}
              onBlur={(e) =>
                setTimeline.mutate({
                  projectId,
                  taskId,
                  startDate: e.target.value ? new Date(e.target.value) : null,
                })
              }
              className="w-full rounded-md border border-border bg-canvas px-2 py-1.5 font-mono text-xs text-ink"
            />
          </Field>

          <Field label="Due date">
            <input
              type="date"
              defaultValue={task.dueDate ? toDateInput(task.dueDate) : ""}
              onBlur={(e) =>
                setTimeline.mutate({
                  projectId,
                  taskId,
                  dueDate: e.target.value ? new Date(e.target.value) : null,
                })
              }
              className="w-full rounded-md border border-border bg-canvas px-2 py-1.5 font-mono text-xs text-ink"
            />
          </Field>
        </div>

        {/* --- Subtasks --- */}
        {task.subtasks.length > 0 && (
          <div className="mt-5">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
              Subtasks
            </p>
            <ul className="space-y-1">
              {task.subtasks.map((st) => (
                <li key={st.id} className="text-sm text-ink">
                  · {st.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* --- Comments --- */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Comments
          </p>
          <div className="space-y-3">
            {task.comments.map((comment) => (
              <div key={comment.id} className="rounded-md border border-border bg-canvas p-2.5">
                <p className="mb-1 font-mono text-[11px] text-muted">
                  {comment.author?.name ?? "Unknown"} ·{" "}
                  {new Date(comment.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-ink">{comment.body}</p>
              </div>
            ))}
            {task.comments.length === 0 && (
              <p className="font-mono text-xs text-muted">No comments yet.</p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!commentBody.trim()) return;
              addComment.mutate({ projectId, taskId, body: commentBody });
            }}
            className="mt-3 flex gap-2"
          >
            <input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 rounded-md border border-border bg-canvas px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-priority-medium"
            />
            <Button type="submit" size="sm" disabled={addComment.isPending}>
              Post
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border p-4">
      <span className="font-mono text-xs text-muted">Task details</span>
      <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
        <X size={18} />
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function toDateInput(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}
