import { appRouter } from "@repo/api";
import { createContext } from "@/server/context";
import { BurndownChart } from "@/components/burndown/burndown-chart";

const DEMO_ORG_SLUG = "acme-dev";

export default async function BurndownPage() {
  const ctx = await createContext();
  const caller = appRouter.createCaller(ctx);

  const org = await caller.organization.getBySlug({ slug: DEMO_ORG_SLUG });
  if (!org) return <EmptyState message={`No org "${DEMO_ORG_SLUG}" found. Run npm run db:seed.`} />;

  const projects = await caller.project.list({ organizationId: org.id });
  const project = projects[0];
  if (!project) return <EmptyState message="No project found for this org." />;

  const sprintList = await caller.sprint.list({ projectId: project.id });
  const targetSprint =
    sprintList.find((s) => s.status === "ACTIVE") ?? sprintList[sprintList.length - 1];

  if (!targetSprint) {
    return <EmptyState message="No sprints yet — create one on the Sprints page." />;
  }

  const { totalPoints, series } = await caller.sprint.burndown({
    projectId: project.id,
    sprintId: targetSprint.id,
  });

  const todayRemaining = series[series.length - 1]?.actual ?? totalPoints;
  const pointsDone = totalPoints - todayRemaining;

  return (
    <main className="min-h-screen bg-canvas p-4">
      <header className="mb-4">
        <h1 className="text-sm font-medium text-ink">
          {project.name}{" "}
          <span className="font-mono text-muted">/ Burndown — {targetSprint.name}</span>
        </h1>
        <p className="mt-1 font-mono text-xs text-muted">
          {totalPoints === 0
            ? "No story points assigned to tasks in this sprint yet."
            : `${pointsDone}/${totalPoints} points done · ${todayRemaining} remaining`}
        </p>
      </header>

      {totalPoints === 0 ? (
        <p className="max-w-md font-mono text-sm text-muted">
          Add story points to tasks in the task detail panel, then assign them to this
          sprint, to see a burndown here.
        </p>
      ) : (
        <div className="max-w-3xl">
          <BurndownChart series={series} />
          <p className="mt-2 font-mono text-[11px] text-muted">
            Dashed = ideal linear burndown. Solid = actual remaining points, based on
            when tasks entered the "Done" column.
          </p>
        </div>
      )}
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
