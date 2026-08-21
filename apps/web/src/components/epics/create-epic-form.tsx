"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@repo/ui";

export function CreateEpicForm({ projectId }: { projectId: string }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#5B8DEF");
  const router = useRouter();

  const createEpic = trpc.epic.create.useMutation({
    onSuccess: () => {
      setName("");
      // The epic list on this page is server-rendered (RSC), not a client
      // query — router.refresh() re-runs the server component to pick up
      // the new row rather than invalidating a client-side cache.
      router.refresh();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        createEpic.mutate({ projectId, name, color });
      }}
      className="flex items-center gap-2 rounded-lg border border-border bg-panel p-3"
    >
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent"
        aria-label="Epic color"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New epic name…"
        className="flex-1 rounded-md border border-border bg-canvas px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-priority-medium"
      />
      <Button type="submit" size="sm" disabled={createEpic.isPending}>
        {createEpic.isPending ? "Adding…" : "Add epic"}
      </Button>
    </form>
  );
}
