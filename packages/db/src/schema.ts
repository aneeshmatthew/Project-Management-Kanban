import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/*  Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const orgRoleEnum = pgEnum("org_role", [
  "OWNER",
  "ADMIN",
  "MEMBER",
  "VIEWER",
]);

export const projectRoleEnum = pgEnum("project_role", ["EDITOR", "VIEWER"]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "NONE",
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "TASK_CREATED",
  "TASK_MOVED",
  "TASK_ASSIGNED",
  "TASK_UPDATED",
  "TASK_DELETED",
  "COMMENT_ADDED",
  "GITHUB_LINKED",
  "GITHUB_SYNCED",
  "MEMBER_ADDED",
  "MEMBER_REMOVED",
]);

/* -------------------------------------------------------------------------- */
/*  Users (assumes auth provider populates this table, e.g. via NextAuth)     */
/* -------------------------------------------------------------------------- */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*  Organizations (workspaces) + membership                                   */
/* -------------------------------------------------------------------------- */

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  plan: varchar("plan", { length: 50 }).notNull().default("free"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull().default("MEMBER"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.organizationId, t.userId] }),
  })
);

/* -------------------------------------------------------------------------- */
/*  GitHub integration (per organization)                                     */
/* -------------------------------------------------------------------------- */

export const githubIntegrations = pgTable("github_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  installationId: varchar("installation_id", { length: 255 }).notNull(),
  // Store encrypted at the application layer before insert; never plaintext.
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  webhookSecret: text("webhook_secret").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*  Projects + project-level membership overrides                             */
/* -------------------------------------------------------------------------- */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    key: varchar("key", { length: 10 }).notNull(), // e.g. "ENG"
    description: text("description"),
    githubRepoId: varchar("github_repo_id", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgKeyUnique: uniqueIndex("projects_org_key_unique").on(
      t.organizationId,
      t.key
    ),
  })
);

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: projectRoleEnum("role").notNull().default("EDITOR"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.userId] }),
  })
);

/* -------------------------------------------------------------------------- */
/*  Boards + Columns                                                          */
/* -------------------------------------------------------------------------- */

export const boards = pgTable("boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(), // "Sprint 12", "Backlog", "Bugs"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const columns = pgTable(
  "columns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(), // "To Do", "In Progress", "Done"
    // Fractional index as text (e.g. "a0", "a1", "a0V") avoids rewriting
    // every row's position on reorder.
    position: varchar("position", { length: 255 }).notNull(),
    wipLimit: integer("wip_limit"),
  },
  (t) => ({
    boardIdx: index("columns_board_idx").on(t.boardId),
  })
);

/* -------------------------------------------------------------------------- */
/*  Tasks (self-referential for subtasks)                                     */
/* -------------------------------------------------------------------------- */

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    columnId: uuid("column_id")
      .notNull()
      .references(() => columns.id, { onDelete: "cascade" }),
    parentTaskId: uuid("parent_task_id"),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    // Fractional index within the column, same technique as columns.position.
    position: varchar("position", { length: 255 }).notNull(),
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    priority: taskPriorityEnum("priority").notNull().default("NONE"),
    dueDate: timestamp("due_date"),
    labels: jsonb("labels").$type<string[]>().notNull().default([]),
    githubIssueId: varchar("github_issue_id", { length: 255 }),
    githubPrNumber: integer("github_pr_number"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    columnIdx: index("tasks_column_idx").on(t.columnId),
    projectIdx: index("tasks_project_idx").on(t.projectId),
    assigneeIdx: index("tasks_assignee_idx").on(t.assigneeId),
    parentTaskFk: index("tasks_parent_task_idx").on(t.parentTaskId),
  })
);

/* -------------------------------------------------------------------------- */
/*  Comments + Attachments                                                    */
/* -------------------------------------------------------------------------- */

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    githubCommentId: varchar("github_comment_id", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    taskIdx: index("comments_task_idx").on(t.taskId),
  })
);

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*  Activity feed / audit log                                                 */
/* -------------------------------------------------------------------------- */

export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: activityTypeEnum("type").notNull(),
    // Freeform payload for event-specific detail, e.g. { fromColumnId, toColumnId }
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("activity_project_idx").on(t.projectId),
    taskIdx: index("activity_task_idx").on(t.taskId),
  })
);

/* -------------------------------------------------------------------------- */
/*  Relations (for Drizzle's relational query API — db.query.tasks.findMany   */
/*  with nested `with: { assignee: true, comments: true }` etc.)              */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  organizationMemberships: many(organizationMembers),
  projectMemberships: many(projectMembers),
  assignedTasks: many(tasks),
  comments: many(comments),
}));

export const organizationsRelations = relations(
  organizations,
  ({ many }) => ({
    members: many(organizationMembers),
    projects: many(projects),
    githubIntegrations: many(githubIntegrations),
  })
);

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
  })
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  members: many(projectMembers),
  boards: many(boards),
  tasks: many(tasks),
  activityEvents: many(activityEvents),
}));

export const projectMembersRelations = relations(
  projectMembers,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectMembers.projectId],
      references: [projects.id],
    }),
    user: one(users, {
      fields: [projectMembers.userId],
      references: [users.id],
    }),
  })
);

export const boardsRelations = relations(boards, ({ one, many }) => ({
  project: one(projects, {
    fields: [boards.projectId],
    references: [projects.id],
  }),
  columns: many(columns),
}));

export const columnsRelations = relations(columns, ({ one, many }) => ({
  board: one(boards, {
    fields: [columns.boardId],
    references: [boards.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  column: one(columns, {
    fields: [tasks.columnId],
    references: [columns.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
  }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: "subtasks",
  }),
  subtasks: many(tasks, { relationName: "subtasks" }),
  comments: many(comments),
  attachments: many(attachments),
  activityEvents: many(activityEvents),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  task: one(tasks, {
    fields: [attachments.taskId],
    references: [tasks.id],
  }),
  uploader: one(users, {
    fields: [attachments.uploadedBy],
    references: [users.id],
  }),
}));

export const activityEventsRelations = relations(
  activityEvents,
  ({ one }) => ({
    project: one(projects, {
      fields: [activityEvents.projectId],
      references: [projects.id],
    }),
    task: one(tasks, {
      fields: [activityEvents.taskId],
      references: [tasks.id],
    }),
    actor: one(users, {
      fields: [activityEvents.actorId],
      references: [users.id],
    }),
  })
);

export const githubIntegrationsRelations = relations(
  githubIntegrations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [githubIntegrations.organizationId],
      references: [organizations.id],
    }),
  })
);
