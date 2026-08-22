import { appRouter } from "@repo/api";
import { createContext } from "@/server/context";
import { Board } from "@/components/board/board";
import { TaskPanel } from "@/components/board/task-panel";
import { BoardSwitcher } from "@/components/board/board-switcher";
import type { ColumnData } from "@/components/board/column";

const DEMO_ORG_SLUG = "acme-dev";

/**
 * Demo route: resolves the seeded "acme-dev" org and its first project.
 * Which board is shown comes from ?boardId=, falling back to the
 * project's first board. In the real app this becomes
 * /org/[orgSlug]/project/[projectKey]/board/[boardId], with ids resolved
 * from the URL path instead of a slug + query param.
 */
export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ boardId?: string }>;
}) {
  const { boardId: requestedBoardId } = await searchParams;
  const ctx = await createContext();
  const caller = appRouter.createCaller(ctx);

  const org = await caller.organization.getBySlug({ slug: DEMO_ORG_SLUG });
  if (!org) {
    return <EmptyState message={`No org "${DEMO_ORG_SLUG}" found. Run npm run db:seed.`} />;
  }

  const projects = await caller.project.list({ organizationId: org.id });
  const project = projects[0];
  if (!project) {
    return <EmptyState message="No project found for this org." />;
  }

  const boardList = await caller.board.list({ projectId: project.id });
  if (boardList.length === 0) {
    return <EmptyState message="No board found for this project." />;
  }

  const activeBoardId =
    requestedBoardId && boardList.some((b) => b.id === requestedBoardId)
      ? requestedBoardId
      : boardList[0]!.id; // safe: boardList.length === 0 already returned above

  const board = await caller.board.get({ projectId: project.id, boardId: activeBoardId });
  if (!board) {
    return <EmptyState message="Board lookup failed." />;
  }

  const columns: ColumnData[] = board.columns.map((col) => ({
    id: col.id,
    name: col.name,
    wipLimit: col.wipLimit,
    position: col.position,
    tasks: col.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      projectKey: project.key,
      taskNumber: task.number,
      position: task.position,
      assigneeId: task.assigneeId,
      assignee: task.assignee
        ? { name: task.assignee.name, avatarUrl: task.assignee.avatarUrl }
        : null,
      owner: task.owner ? { name: task.owner.name } : null,
      epic: task.epic ? { name: task.epic.name, color: task.epic.color } : null,
      storyPoints: task.storyPoints,
      dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null,
      labels: task.labels,
      commentCount: task.comments.length,
    })),
  }));

  return (
    <main className="min-h-screen bg-canvas">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-sm font-medium text-ink">
          {project.name} <span className="font-mono text-muted">/ {board.name}</span>
        </h1>
        <BoardSwitcher
          projectId={project.id}
          currentBoardId={board.id}
          boards={boardList.map((b) => ({ id: b.id, name: b.name }))}
        />
      </header>
      <Board
        projectId={project.id}
        boardId={board.id}
        columns={columns}
        currentUserId={ctx.session?.userId ?? null}
      />
      <TaskPanel projectId={project.id} />
    </main>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas">
      <p className="font-mono text-sm text-muted">{message}</p>
    </main>
  );
}
