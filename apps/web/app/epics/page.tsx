import { appRouter } from "@repo/api";
import { createContext } from "@/server/context";
import { EpicCard } from "@/components/epics/epic-card";
import { CreateEpicForm } from "@/components/epics/create-epic-form";

const DEMO_ORG_SLUG = "acme-dev";

export default async function EpicsPage() {
  const ctx = await createContext();
  const caller = appRouter.createCaller(ctx);

  const org = await caller.organization.getBySlug({ slug: DEMO_ORG_SLUG });
  if (!org) return <EmptyState message={`No org "${DEMO_ORG_SLUG}" found. Run npm run db:seed.`} />;

  const projects = await caller.project.list({ organizationId: org.id });
  const project = projects[0];
  if (!project) return <EmptyState message="No project found for this org." />;

  const epics = await caller.epic.list({ projectId: project.id });

  return (
    <main className="min-h-screen bg-canvas p-4">
      <header className="mb-4">
        <h1 className="text-sm font-medium text-ink">
          {project.name} <span className="font-mono text-muted">/ Epics</span>
        </h1>
        <p className="mt-1 text-xs text-muted">
          Larger initiatives that span sprints. A task can belong to an epic, a
          sprint, both, or neither.
        </p>
      </header>

      <div className="mb-4 max-w-2xl">
        <CreateEpicForm projectId={project.id} />
      </div>

      <div className="grid max-w-2xl gap-3">
        {epics.length === 0 && (
          <p className="font-mono text-sm text-muted">No epics yet — add one above.</p>
        )}
        {epics.map((epic) => (
          <EpicCard
            key={epic.id}
            epic={{
              id: epic.id,
              name: epic.name,
              description: epic.description,
              status: epic.status,
              color: epic.color,
              owner: epic.owner ? { name: epic.owner.name } : null,
              targetDate: epic.targetDate
                ? new Date(epic.targetDate).toLocaleDateString()
                : null,
              taskCount: epic.tasks.length,
            }}
          />
        ))}
      </div>
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
