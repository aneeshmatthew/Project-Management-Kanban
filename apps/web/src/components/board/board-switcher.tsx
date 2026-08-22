"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc-client";

export interface BoardOption {
  id: string;
  name: string;
}

export function BoardSwitcher({
  projectId,
  currentBoardId,
  boards,
}: {
  projectId: string;
  currentBoardId: string;
  boards: BoardOption[];
}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");

  const createBoard = trpc.board.create.useMutation({
    onSuccess: (board) => {
      setName("");
      setIsCreating(false);
      router.push(`/board?boardId=${board.id}`);
      router.refresh();
    },
  });

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentBoardId}
        onChange={(e) => router.push(`/board?boardId=${e.target.value}`)}
        className="rounded border border-border bg-canvas px-2 py-1 font-mono text-xs text-muted"
      >
        {boards.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      {isCreating ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createBoard.mutate({ projectId, name: name.trim() });
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => !name.trim() && setIsCreating(false)}
            placeholder="Board name…"
            className="w-32 rounded border border-priority-medium bg-canvas px-2 py-1 text-xs text-ink placeholder:text-muted focus:outline-none"
          />
        </form>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1 text-[11px] text-muted hover:text-ink"
        >
          <Plus size={12} />
          New board
        </button>
      )}
    </div>
  );
}
