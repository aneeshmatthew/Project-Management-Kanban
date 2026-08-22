import { generateKeyBetween } from "fractional-indexing";
import { trpc } from "@/lib/trpc-client";

/**
 * Quick-add wraps task.create with an optimistic insert. Unlike
 * useMoveTask, the mutation response here is a bare task row with no
 * joined relations (assignee/owner/epic/comments) — reshaping that into
 * the board.get cache's expected shape isn't worth it for a row that's
 * about to be replaced anyway, so this inserts a lightweight stub with
 * null relations and lets onSettled's invalidate fetch the accurate,
 * fully-joined row instead of trying to keep the stub authoritative.
 */
export function useCreateTask(projectId: string, boardId: string) {
  const utils = trpc.useUtils();

  return trpc.task.create.useMutation({
    onMutate: async (input) => {
      await utils.board.get.cancel({ projectId, boardId });
      const previous = utils.board.get.getData({ projectId, boardId });

      const tempId = `temp-${Math.random().toString(36).slice(2)}`;
      const position = generateKeyBetween(input.afterPosition ?? null, null);

      utils.board.get.setData({ projectId, boardId }, (old) => {
        if (!old) return old;

        const updatedColumns = old.columns.map((col) => {
          if (col.id !== input.columnId) return col;
          return {
            ...col,
            tasks: [
              ...col.tasks,
              {
                id: tempId,
                projectId,
                columnId: input.columnId,
                number: 0, // placeholder — real number arrives on refetch
                epicId: null,
                sprintId: null,
                parentTaskId: null,
                title: input.title,
                description: input.description ?? null,
                position,
                assigneeId: null,
                ownerId: null,
                priority: "NONE" as const,
                storyPoints: null,
                startDate: null,
                dueDate: null,
                labels: [] as string[],
                githubIssueId: null,
                githubPrNumber: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                assignee: null,
                owner: null,
                epic: null,
                comments: [],
              },
            ].sort((a, b) => a.position.localeCompare(b.position)),
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
