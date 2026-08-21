import { generateKeyBetween } from "fractional-indexing";
import { db } from "./client";
import {
  users,
  organizations,
  organizationMembers,
  projects,
  projectMembers,
  boards,
  columns,
  tasks,
  comments,
  activityEvents,
} from "./schema";

const DEMO_ORG_SLUG = "acme-dev";

async function main() {
  console.log("Seeding...");

  // Idempotency guard — re-running `npm run db:seed` shouldn't duplicate data.
  const existingOrg = await db.query.organizations.findFirst({
    where: (o, { eq }) => eq(o.slug, DEMO_ORG_SLUG),
  });

  if (existingOrg) {
    console.log(`Org "${DEMO_ORG_SLUG}" already exists — skipping seed.`);
    return;
  }

  // --- User -----------------------------------------------------------
  const [owner] = await db
    .insert(users)
    .values({
      email: "owner@example.com",
      name: "Aneesh Mathew",
      avatarUrl: null,
    })
    .returning();

  const [teammate] = await db
    .insert(users)
    .values({
      email: "teammate@example.com",
      name: "Jordan Rivera",
      avatarUrl: null,
    })
    .returning();

  // --- Organization -----------------------------------------------------
  const [org] = await db
    .insert(organizations)
    .values({ name: "Acme Dev", slug: DEMO_ORG_SLUG, plan: "free" })
    .returning();

  await db.insert(organizationMembers).values([
    { organizationId: org.id, userId: owner.id, role: "OWNER" },
    { organizationId: org.id, userId: teammate.id, role: "MEMBER" },
  ]);

  // --- Project ------------------------------------------------------------
  const [project] = await db
    .insert(projects)
    .values({
      organizationId: org.id,
      name: "PM Tool",
      key: "PMT",
      description: "The developer-focused project management tool itself.",
    })
    .returning();

  await db.insert(projectMembers).values([
    { projectId: project.id, userId: owner.id, role: "EDITOR" },
    { projectId: project.id, userId: teammate.id, role: "EDITOR" },
  ]);

  // --- Board + columns ------------------------------------------------
  const [board] = await db
    .insert(boards)
    .values({ projectId: project.id, name: "Sprint 1" })
    .returning();

  const columnDefs = ["Backlog", "To Do", "In Progress", "Done"];
  let colPos: string | null = null;
  const insertedColumns = [];
  for (const name of columnDefs) {
    colPos = generateKeyBetween(colPos, null);
    const [col] = await db
      .insert(columns)
      .values({ boardId: board.id, name, position: colPos })
      .returning();
    insertedColumns.push(col);
  }
  const [backlog, todo, inProgress, done] = insertedColumns;

  // --- Tasks -------------------------------------------------------------
  const sampleTasks: Array<{
    columnId: string;
    title: string;
    description: string;
    priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    assigneeId?: string;
  }> = [
    {
      columnId: backlog.id,
      title: "Design activity feed UI",
      description: "Sketch the feed layout for project-level activity events.",
      priority: "LOW",
    },
    {
      columnId: backlog.id,
      title: "Add keyboard shortcuts",
      description: "Cmd+K command palette, j/k navigation on the board.",
      priority: "LOW",
    },
    {
      columnId: todo.id,
      title: "Build sign-in page",
      description: "GitHub OAuth via Auth.js, redirect to callbackUrl after login.",
      priority: "HIGH",
      assigneeId: owner.id,
    },
    {
      columnId: todo.id,
      title: "Set up GitHub App webhook",
      description: "Register the GitHub App, subscribe to issues + issue_comment.",
      priority: "MEDIUM",
      assigneeId: teammate.id,
    },
    {
      columnId: inProgress.id,
      title: "Kanban board drag-and-drop",
      description: "Wire task.move to drag events with optimistic updates.",
      priority: "URGENT",
      assigneeId: owner.id,
    },
    {
      columnId: done.id,
      title: "Drizzle schema + migrations",
      description: "Org, project, board, column, task, comment, activity tables.",
      priority: "MEDIUM",
      assigneeId: owner.id,
    },
  ];

  // Track per-column position cursors so tasks land in a sane order.
  const posCursor: Record<string, string | null> = {
    [backlog.id]: null,
    [todo.id]: null,
    [inProgress.id]: null,
    [done.id]: null,
  };

  const insertedTasks = [];
  for (const t of sampleTasks) {
    const position = generateKeyBetween(posCursor[t.columnId], null);
    posCursor[t.columnId] = position;

    const [task] = await db
      .insert(tasks)
      .values({
        projectId: project.id,
        columnId: t.columnId,
        title: t.title,
        description: t.description,
        position,
        priority: t.priority,
        assigneeId: t.assigneeId,
      })
      .returning();
    insertedTasks.push(task);

    await db.insert(activityEvents).values({
      projectId: project.id,
      taskId: task.id,
      actorId: t.assigneeId ?? owner.id,
      type: "TASK_CREATED",
      payload: { title: task.title },
    });
  }

  // --- A couple of comments on the in-progress task -----------------------
  const kanbanTask = insertedTasks.find((t) => t.title.includes("drag-and-drop"));
  if (kanbanTask) {
    await db.insert(comments).values([
      {
        taskId: kanbanTask.id,
        authorId: teammate.id,
        body: "Should we use dnd-kit or roll our own pointer handling for this?",
      },
      {
        taskId: kanbanTask.id,
        authorId: owner.id,
        body: "Let's try dnd-kit first — Reanimated only matters once mobile exists.",
      },
    ]);
  }

  console.log("Seed complete:");
  console.log(`  org:     ${org.name} (${org.slug})`);
  console.log(`  users:   ${owner.email}, ${teammate.email}`);
  console.log(`  project: ${project.name} [${project.key}]`);
  console.log(`  board:   ${board.name} with ${insertedColumns.length} columns`);
  console.log(`  tasks:   ${insertedTasks.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
