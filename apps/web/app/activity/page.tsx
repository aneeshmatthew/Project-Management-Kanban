import { appRouter } from "@repo/api";
import { createContext } from "@/server/context";
import { describeActivityEvent } from "@/lib/activity";
import {
  GitBranch,
  MessageSquare,
  MoveRight,
  PlusCircle,
  Trash2,
  UserPlus,
  Layers,
  Rocket,
  CheckCircle2,
  Pencil,
} from "lucide-react";

const DEMO_ORG_SLUG = "acme-dev";

const ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  TASK_CREATED: PlusCircle,
  TASK_MOVED: MoveRight,
  TASK_ASSIGNED: UserPlus,
  TASK_UPDATED: Pencil,
  TASK_DELETED: Trash2,
  COMMENT_ADDED: MessageSquare,
  GITHUB_LINKED: GitBranch,
  GITHUB_SYNCED: GitBranch,
  MEMBER_ADDED: UserPlus,
  MEMBER_REMOVED: UserPlus,
  EPIC_CREATED: Layers,
  SPRINT_STARTED: Rocket,
  SPRINT_COMPLETED: CheckCircle2,
};

export default async function ActivityPage() {
  const ctx = await createContext();
  const caller = appRouter.createCaller(ctx);

  const org = await caller.organization.getBySlug({ slug: DEMO_ORG_SLUG });
  if (!org) return <EmptyState message={`No org "${DEMO_ORG_SLUG}" found. Run npm run db:seed.`} />;

  const projects = await caller.project.list({ organizationId: org.id });
  const project = projects[0];
  if (!project) return <EmptyState message="No project found for this org." />;

  const events = await caller.activity.list({ projectId: project.id });

  return (
    <main className="min-h-screen bg-canvas p-4">
      <header className="mb-4">
        <h1 className="text-sm font-medium text-ink">
          {project.name} <span className="font-mono text-muted">/ Activity</span>
        </h1>
      </header>

      <div className="max-w-2xl">
        {events.length === 0 && (
          <p className="font-mono text-sm text-muted">No activity yet.</p>
        )}

        <ul className="relative space-y-4 border-l border-border pl-4">
          {events.map((event) => {
            const Icon = ICON[event.type] ?? Pencil;
            return (
              <li key={event.id} className="relative">
                <span className="absolute -left-[21px] flex h-6 w-6 items-center justify-center rounded-full border border-border bg-panel">
                  <Icon size={12} className="text-muted" />
                </span>
                <p className="text-sm text-ink">
                  {describeActivityEvent(event, project.key)}
                </p>
                <p className="font-mono text-[11px] text-muted">
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </li>
            );
          })}
        </ul>
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
