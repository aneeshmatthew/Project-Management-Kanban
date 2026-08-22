import { appRouter } from "@repo/api";
import { createContext } from "@/server/context";
import { TaskTable } from "@/components/list/task-table";
import { TaskPanel } from "@/components/board/task-panel";

const DEMO_ORG_SLUG = "acme-dev";

export default async function ListPage() {
  const ctx = await createContext();
  const caller = appRouter.createCaller(ctx);

  const org = await caller.organization.getBySlug({ slug: DEMO_ORG_SLUG });
  if (!org) return <EmptyState message={`No org "${DEMO_ORG_SLUG}" found. Run npm run db:seed.`} />;

  const projects = await caller.project.list({ organizationId: org.id });
  const project = projects[0];
  if (!project) return <EmptyState message="No project found for this org." />;

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-sm font-medium text-ink">
          {project.name} <span className="font-mono text-muted">/ List</span>
        </h1>
      </header>
      <TaskTable projectId={project.id} projectKey={project.key} />
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
