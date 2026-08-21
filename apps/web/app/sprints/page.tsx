import { appRouter } from "@repo/api";
import { createContext } from "@/server/context";
import { SprintRow } from "@/components/sprints/sprint-row";
import { CreateSprintForm } from "@/components/sprints/create-sprint-form";

const DEMO_ORG_SLUG = "acme-dev";

export default async function SprintsPage() {
  const ctx = await createContext();
  const caller = appRouter.createCaller(ctx);

  const org = await caller.organization.getBySlug({ slug: DEMO_ORG_SLUG });
  if (!org) return <EmptyState message={`No org "${DEMO_ORG_SLUG}" found. Run npm run db:seed.`} />;

  const projects = await caller.project.list({ organizationId: org.id });
  const project = projects[0];
  if (!project) return <EmptyState message="No project found for this org." />;

  const sprints = await caller.sprint.list({ projectId: project.id });

  return (
    <main className="min-h-screen bg-canvas p-4">
      <header className="mb-4">
        <h1 className="text-sm font-medium text-ink">
          {project.name} <span className="font-mono text-muted">/ Sprints</span>
        </h1>
        <p className="mt-1 text-xs text-muted">
          Time-boxed iterations. Start a sprint to make it active, complete it
          when the window ends.
        </p>
      </header>

      <div className="mb-4 max-w-3xl">
        <CreateSprintForm projectId={project.id} />
      </div>

      <div className="grid max-w-3xl gap-3">
        {sprints.length === 0 && (
          <p className="font-mono text-sm text-muted">No sprints yet — add one above.</p>
        )}
        {sprints.map((sprint) => (
          <SprintRow
            key={sprint.id}
            projectId={project.id}
            sprint={{
              id: sprint.id,
              name: sprint.name,
              goal: sprint.goal,
              status: sprint.status,
              startDate: new Date(sprint.startDate).toLocaleDateString(),
              endDate: new Date(sprint.endDate).toLocaleDateString(),
              taskCount: sprint.tasks.length,
              totalPoints: sprint.tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0),
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
