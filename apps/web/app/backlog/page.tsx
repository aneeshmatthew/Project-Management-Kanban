import { appRouter } from "@repo/api";
import { createContext } from "@/server/context";
import { BacklogView } from "@/components/sprints/backlog-view";

const DEMO_ORG_SLUG = "acme-dev";

export default async function BacklogPage() {
  const ctx = await createContext();
  const caller = appRouter.createCaller(ctx);

  const org = await caller.organization.getBySlug({ slug: DEMO_ORG_SLUG });
  if (!org) return <EmptyState message={`No org "${DEMO_ORG_SLUG}" found. Run npm run db:seed.`} />;

  const projects = await caller.project.list({ organizationId: org.id });
  const project = projects[0];
  if (!project) return <EmptyState message="No project found for this org." />;

  return (
    <main className="min-h-screen bg-canvas p-4">
      <header className="mb-4">
        <h1 className="text-sm font-medium text-ink">
          {project.name} <span className="font-mono text-muted">/ Backlog</span>
        </h1>
        <p className="mt-1 text-xs text-muted">
          Drag tasks between the backlog and a sprint to plan.
        </p>
      </header>

      <BacklogView projectId={project.id} projectKey={project.key} />
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
