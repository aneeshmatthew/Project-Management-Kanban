"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@repo/ui";

export function CreateSprintForm({ projectId }: { projectId: string }) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const router = useRouter();

  const createSprint = trpc.sprint.create.useMutation({
    onSuccess: () => {
      setName("");
      setGoal("");
      setStartDate("");
      setEndDate("");
      router.refresh();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !startDate || !endDate) return;
        createSprint.mutate({
          projectId,
          name,
          goal: goal || undefined,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        });
      }}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-panel p-3"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Sprint name…"
        className="w-40 rounded-md border border-border bg-canvas px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-priority-medium"
      />
      <input
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="Goal (optional)…"
        className="flex-1 min-w-[160px] rounded-md border border-border bg-canvas px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-priority-medium"
      />
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="rounded-md border border-border bg-canvas px-2 py-1.5 font-mono text-xs text-ink focus:outline-none focus:ring-1 focus:ring-priority-medium"
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="rounded-md border border-border bg-canvas px-2 py-1.5 font-mono text-xs text-ink focus:outline-none focus:ring-1 focus:ring-priority-medium"
      />
      <Button type="submit" size="sm" disabled={createSprint.isPending}>
        {createSprint.isPending ? "Adding…" : "Add sprint"}
      </Button>
    </form>
  );
}
