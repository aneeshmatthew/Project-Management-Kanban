import { generateKeyBetween } from "fractional-indexing";
import { trpc } from "@/lib/trpc-client";

/**
 * Wraps task.move with an optimistic update against the board.get query
 * cache, so the card visually jumps to its new column/position instantly
 * rather than waiting on the round trip. On error, TanStack Query's
 * onError rolls back to the snapshot taken in onMutate.
 */
export function useMoveTask(projectId: string, boardId: string) {
  const utils = trpc.useUtils();

  return trpc.task.move.useMutation({
    onMutate: async (input) => {
      await utils.board.get.cancel({ projectId, boardId });
      const previous = utils.board.get.getData({ projectId, boardId });

      utils.board.get.setData({ projectId, boardId }, (old) => {
        if (!old) return old;

        const newPosition = generateKeyBetween(
          input.beforePosition,
          input.afterPosition
        );

        let movedTask: (typeof old.columns)[number]["tasks"][number] | undefined;

        const columnsWithoutTask = old.columns.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => {
            if (t.id === input.taskId) {
              movedTask = t;
              return false;
            }
            return true;
          }),
        }));

        if (!movedTask) return old;

        const updatedColumns = columnsWithoutTask.map((col) => {
          if (col.id !== input.toColumnId) return col;
          const updatedTask = {
            ...movedTask!,
            columnId: input.toColumnId,
            position: newPosition,
          };
          return {
            ...col,
            tasks: [...col.tasks, updatedTask].sort((a, b) =>
              a.position.localeCompare(b.position)
            ),
          };
        });

        return { ...old, columns: updatedColumns };
      });

      return { previous };
    },

    onError: (_err, _input, context) => {
      if (context?.previous) {
        utils.board.get.setData({ projectId, boardId }, context.previous);
      }
    },

    onSettled: () => {
      utils.board.get.invalidate({ projectId, boardId });
    },
  });
}
