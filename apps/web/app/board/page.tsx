import { appRouter } from "@repo/api";
import { createContext } from "@/server/context";
import { Board } from "@/components/board/board";
import { TaskPanel } from "@/components/board/task-panel";
import type { ColumnData } from "@/components/board/column";

const DEMO_ORG_SLUG = "acme-dev";

/**
 * Demo route: resolves the seeded "acme-dev" org, its first project, and
 * that project's first board. In the real app this becomes
 * /org/[orgSlug]/project/[projectKey]/board/[boardId], with ids resolved
 * from the URL instead of a hardcoded slug.
 */
export default async function BoardPage() {
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

  const boardStub = await caller.board.getFirstForProject({ projectId: project.id });
  if (!boardStub) {
    return <EmptyState message="No board found for this project." />;
  }

  const board = await caller.board.get({ projectId: project.id, boardId: boardStub.id });
  if (!board) {
    return <EmptyState message="Board lookup failed." />;
  }

  const columns: ColumnData[] = board.columns.map((col) => ({
    id: col.id,
    name: col.name,
    wipLimit: col.wipLimit,
    tasks: col.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      projectKey: project.key,
      taskNumber: task.number,
      assignee: task.assignee
        ? { name: task.assignee.name, avatarUrl: task.assignee.avatarUrl }
        : null,
      owner: task.owner ? { name: task.owner.name } : null,
      epic: task.epic ? { name: task.epic.name, color: task.epic.color } : null,
      dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null,
      commentCount: task.comments.length,
    })),
  }));

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-sm font-medium text-ink">
          {project.name}{" "}
          <span className="font-mono text-muted">/ {board.name}</span>
        </h1>
      </header>
      <Board projectId={project.id} boardId={board.id} columns={columns} />
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
