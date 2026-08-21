import { trpc } from "@/lib/trpc-client";

/**
 * Moves a task between the backlog and a sprint (or between two sprints).
 * Optimistically updates the combined `sprint.planningBoard` cache so the
 * card jumps to its new section immediately.
 */
export function useAssignSprint(projectId: string) {
  const utils = trpc.useUtils();

  return trpc.task.setSprint.useMutation({
    onMutate: async (input) => {
      await utils.sprint.planningBoard.cancel({ projectId });
      const previous = utils.sprint.planningBoard.getData({ projectId });

      utils.sprint.planningBoard.setData({ projectId }, (old) => {
        if (!old) return old;

        let movedTask: (typeof old.backlog)[number] | undefined;

        const backlogWithout = old.backlog.filter((t) => {
          if (t.id === input.taskId) {
            movedTask = t;
            return false;
          }
          return true;
        });

        const sprintsWithout = old.sprints.map((s) => ({
          ...s,
          tasks: s.tasks.filter((t) => {
            if (t.id === input.taskId) {
              movedTask = t;
              return false;
            }
            return true;
          }),
        }));

        if (!movedTask) return old;

        if (input.sprintId === null) {
          return {
            backlog: [...backlogWithout, { ...movedTask, sprintId: null }],
            sprints: sprintsWithout,
          };
        }

        return {
          backlog: backlogWithout,
          sprints: sprintsWithout.map((s) =>
            s.id === input.sprintId
              ? { ...s, tasks: [...s.tasks, { ...movedTask!, sprintId: input.sprintId }] }
              : s
          ),
        };
      });

      return { previous };
    },

    onError: (_err, _input, context) => {
      if (context?.previous) {
        utils.sprint.planningBoard.setData({ projectId }, context.previous);
      }
    },

    onSettled: () => {
      utils.sprint.planningBoard.invalidate({ projectId });
    },
  });
}
