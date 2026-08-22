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
  epics,
  sprints,
} from "./schema";

const DEMO_ORG_SLUG = "acme-dev";

/**
 * Drizzle's `.returning()` always types as `T[]`, so destructuring
 * `const [row] = await db.insert(...).returning()` types `row` as
 * `T | undefined` under this repo's `noUncheckedIndexedAccess` tsconfig
 * setting — even though an insert that doesn't throw always returns at
 * least one row. This helper asserts that at runtime (so a genuinely
 * empty result still fails loudly) and gives every callsite below a
 * non-optional type instead of scattering `!` assertions everywhere.
 */
function firstOrThrow<T>(rows: T[], context: string): T {
  const row = rows[0];
  if (!row) throw new Error(`Expected at least one row from ${context}, got none`);
  return row;
}

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

  // --- Users ---------------------------------------------------------------
  const owner = firstOrThrow(
    await db
      .insert(users)
      .values({ email: "owner@example.com", name: "Aneesh Mathew", avatarUrl: null })
      .returning(),
    "insert owner user"
  );

  const teammate = firstOrThrow(
    await db
      .insert(users)
      .values({ email: "teammate@example.com", name: "Jordan Rivera", avatarUrl: null })
      .returning(),
    "insert teammate user"
  );

  // --- Organization ----------------------------------------------------------
  const org = firstOrThrow(
    await db
      .insert(organizations)
      .values({ name: "Acme Dev", slug: DEMO_ORG_SLUG, plan: "free" })
      .returning(),
    "insert organization"
  );

  await db.insert(organizationMembers).values([
    { organizationId: org.id, userId: owner.id, role: "OWNER" },
    { organizationId: org.id, userId: teammate.id, role: "MEMBER" },
  ]);

  // --- Project -----------------------------------------------------------
  const project = firstOrThrow(
    await db
      .insert(projects)
      .values({
        organizationId: org.id,
        name: "PM Tool",
        key: "PMT",
        description: "The developer-focused project management tool itself.",
      })
      .returning(),
    "insert project"
  );

  await db.insert(projectMembers).values([
    { projectId: project.id, userId: owner.id, role: "EDITOR" },
    { projectId: project.id, userId: teammate.id, role: "EDITOR" },
  ]);

  // --- Epic + Sprint (PM-facing planning layer) -----------------------------
  const epic = firstOrThrow(
    await db
      .insert(epics)
      .values({
        projectId: project.id,
        name: "Board v1",
        description: "Ship the core Kanban board experience end to end.",
        status: "IN_PROGRESS",
        color: "#5B8DEF",
        ownerId: owner.id,
        startDate: new Date(),
        targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21), // +21 days
      })
      .returning(),
    "insert epic"
  );

  const now = new Date();
  const sprint = firstOrThrow(
    await db
      .insert(sprints)
      .values({
        projectId: project.id,
        name: "Sprint 1",
        goal: "Get the board rendering real data with drag-and-drop.",
        status: "ACTIVE",
        startDate: now,
        endDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14), // +14 days
      })
      .returning(),
    "insert sprint"
  );

  // --- Board + columns -----------------------------------------------------
  const board = firstOrThrow(
    await db
      .insert(boards)
      .values({ projectId: project.id, name: "Sprint 1" })
      .returning(),
    "insert board"
  );

  const columnDefs: { name: string; wipLimit: number | null }[] = [
    { name: "Backlog", wipLimit: null },
    { name: "To Do", wipLimit: null },
    // Set to 1 and the seed data already puts exactly one task here, so
    // WIP enforcement is demonstrable immediately: dragging any second
    // task into "In Progress" should be blocked without further setup.
    { name: "In Progress", wipLimit: 1 },
    { name: "Done", wipLimit: null },
  ];
  let colPos: string | null = null;
  const insertedColumns: (typeof columns.$inferSelect)[] = [];
  for (const { name, wipLimit } of columnDefs) {
    colPos = generateKeyBetween(colPos, null);
    const col = firstOrThrow(
      await db
        .insert(columns)
        .values({ boardId: board.id, name, position: colPos, wipLimit })
        .returning(),
      `insert column "${name}"`
    );
    insertedColumns.push(col);
  }

  const backlog = firstOrThrow(
    insertedColumns.filter((c) => c.name === "Backlog"),
    'find "Backlog" column just inserted'
  );
  const todo = firstOrThrow(
    insertedColumns.filter((c) => c.name === "To Do"),
    'find "To Do" column just inserted'
  );
  const inProgress = firstOrThrow(
    insertedColumns.filter((c) => c.name === "In Progress"),
    'find "In Progress" column just inserted'
  );
  const done = firstOrThrow(
    insertedColumns.filter((c) => c.name === "Done"),
    'find "Done" column just inserted'
  );

  // --- Tasks -----------------------------------------------------------------
  const sampleTasks: Array<{
    columnId: string;
    title: string;
    description: string;
    priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    storyPoints?: number;
    assigneeId?: string;
    ownerId?: string;
    dueDate?: Date;
  }> = [
    {
      columnId: backlog.id,
      title: "Design activity feed UI",
      description: "Sketch the feed layout for project-level activity events.",
      priority: "LOW",
      storyPoints: 2,
      ownerId: owner.id,
    },
    {
      columnId: backlog.id,
      title: "Add keyboard shortcuts",
      description: "Cmd+K command palette, j/k navigation on the board.",
      priority: "LOW",
      storyPoints: 3,
      ownerId: owner.id,
    },
    {
      columnId: todo.id,
      title: "Build sign-in page",
      description: "GitHub OAuth via Auth.js, redirect to callbackUrl after login.",
      priority: "HIGH",
      storyPoints: 5,
      assigneeId: owner.id,
      ownerId: owner.id,
      dueDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3),
    },
    {
      columnId: todo.id,
      title: "Set up GitHub App webhook",
      description: "Register the GitHub App, subscribe to issues + issue_comment.",
      priority: "MEDIUM",
      storyPoints: 3,
      assigneeId: teammate.id,
      ownerId: owner.id,
      dueDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5),
    },
    {
      columnId: inProgress.id,
      title: "Kanban board drag-and-drop",
      description: "Wire task.move to drag events with optimistic updates.",
      priority: "URGENT",
      storyPoints: 8,
      assigneeId: owner.id,
      ownerId: owner.id,
      dueDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2),
    },
    {
      columnId: done.id,
      title: "Drizzle schema + migrations",
      description: "Org, project, board, column, task, comment, activity tables.",
      priority: "MEDIUM",
      storyPoints: 5,
      assigneeId: owner.id,
      ownerId: owner.id,
    },
  ];

  // Track per-column position cursors so tasks land in a sane order.
  const posCursor: Record<string, string | null> = {
    [backlog.id]: null,
    [todo.id]: null,
    [inProgress.id]: null,
    [done.id]: null,
  };

  const insertedTasks: (typeof tasks.$inferSelect)[] = [];
  let taskNumber = 1;
  for (const t of sampleTasks) {
    const position = generateKeyBetween(posCursor[t.columnId] ?? null, null);
    posCursor[t.columnId] = position;

    const task = firstOrThrow(
      await db
        .insert(tasks)
        .values({
          projectId: project.id,
          columnId: t.columnId,
          number: taskNumber++,
          title: t.title,
          description: t.description,
          position,
          priority: t.priority,
          storyPoints: t.storyPoints,
          assigneeId: t.assigneeId,
          ownerId: t.ownerId,
          epicId: epic.id,
          sprintId: sprint.id,
          dueDate: t.dueDate,
        })
        .returning(),
      `insert task "${t.title}"`
    );
    insertedTasks.push(task);

    await db.insert(activityEvents).values({
      projectId: project.id,
      taskId: task.id,
      actorId: t.assigneeId ?? owner.id,
      type: "TASK_CREATED",
      payload: { title: task.title },
    });
  }

  // --- A couple of comments on the in-progress task -------------------------
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
  console.log(`  epic:    ${epic.name}`);
  console.log(`  sprint:  ${sprint.name}`);
  console.log(`  board:   ${board.name} with ${insertedColumns.length} columns`);
  console.log(`  tasks:   ${insertedTasks.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
