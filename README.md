# PM Tool — Project Management for Real Teams

A Linear/Jira-style project management tool for project managers running
sprints and epics — full planning hierarchy (Epic → Sprint → Task), owner
vs. assignee distinction, and timelines — with a Kanban board as the daily
working view. Built to showcase a modern full-stack TypeScript
architecture: Next.js App Router + RSC, tRPC, Drizzle/Postgres. Optional
GitHub sync mirrors issues/comments into tasks for teams with engineers
on them, but the tool itself is built for how PMs plan, not just how
developers track tickets.

## Stack

- **Web:** Next.js (App Router, RSC), React 19
- **Monorepo:** Turborepo
- **Data/state:** tRPC, TanStack Query, Zustand
- **DB:** PostgreSQL (Neon) via Drizzle ORM
- **UI:** Tailwind CSS, class-variance-authority, Framer Motion
- **Mobile:** deferred — see `apps/mobile/README.md`

## Planning model

```
Epic (initiative, has an owner + target date)
  └─ Sprint (time-boxed iteration, start/end dates, goal)
       └─ Task (priority, owner, assignee, start/due date, status via column)
```

Epics and Sprints are independent of each other and both attach directly
to a Task — a task can belong to an epic, a sprint, both, or neither.
This mirrors how PM tools like Linear/Jira actually work: epics span
sprints, they don't nest inside them.


## Structure

```
apps/
  web/          Next.js app
  mobile/       placeholder for future Expo app
packages/
  api/          tRPC routers (project, task, github)
  db/           Drizzle schema + client
  ui/           shared component library
```

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, GITHUB_APP_SLUG, GITHUB_WEBHOOK_SECRET
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Seed data

`npm run db:seed` creates a demo org (`acme-dev`) with two users, one
project, one board with four columns, six sample tasks (spread across
columns, with priorities/assignees), and two comments. It's idempotent —
re-running it checks for the `acme-dev` org first and skips if found.

**Note:** seeded users (`owner@example.com`, `teammate@example.com`) are
plain rows in the `users` table — they aren't linked to a real GitHub
account, so you can't literally sign in *as* them via GitHub OAuth. To
actually browse the seeded data as yourself, sign in once with your own
GitHub account first, then either update the seed script to use your
real email, or manually add yourself to `organization_members` /
`project_members` for the `acme-dev` org via `npm run db:studio`.

---

## Project tracker

Check items off as they're built. Update this file directly as work lands.

### Foundation / infra

- [x] Turborepo scaffold (`apps/web`, `apps/mobile` placeholder, `packages/api`, `packages/db`, `packages/ui`)
- [x] Drizzle schema (orgs, projects, epics, sprints, boards, columns, tasks, comments, attachments, activity, GitHub integration)
- [x] tRPC base setup (context, `protectedProcedure`, `projectProcedure` permission middleware)
- [x] `project` router (list, listMembers, create, connectGithubRepo, addMember)
- [x] `task` router (create, move w/ fractional indexing, assign, setOwner, setTimeline, setEpic, setSprint, setStoryPoints, setLabels, getById, addComment)
- [x] `epic` router (list, create, update)
- [x] `sprint` router (list, planningBoard, burndown, create, start, complete)
- [x] `board` router (get with columns/tasks, getFirstForProject)
- [x] `organization` router (getBySlug)
- [x] `activity` router (list)
- [x] `github` router + webhook route (signature verification, issue/comment sync)
- [x] Auth provider chosen and wired — Auth.js v5, GitHub OAuth, JWT sessions, upsert into `users` table (`apps/web/src/lib/auth.ts`, `middleware.ts`, `/sign-in`)
- [ ] Database migrated against a real Neon instance (`db:generate` + `db:migrate` run)
- [x] Seed script (org, project, epic, sprint, board, columns, tasks, comments) for local dev — `npm run db:seed` (idempotent, skips if demo org already exists)
- [ ] GitHub App registered (real `GITHUB_APP_SLUG`, per-installation webhook secrets wired to `githubIntegrations.webhookSecret` instead of one global env var)
- [ ] Real "system/GitHub" user row for comment attribution (currently stubbed)
- [ ] Per-project task numbering moved off max+1 counter to a real sequence/counters table (current approach can race under concurrent writes)
- [ ] Vercel project connected, Root Directory set to `apps/web`, Turborepo remote caching confirmed
- [ ] Neon database provisioned for production

### Pages / screens

- [x] Sign in (`/sign-in`, GitHub OAuth via Auth.js)
- [x] Kanban board view (`/board`) — columns, cards, drag-and-drop, priority accent bar, epic chip, due date, owner/assignee (currently a hardcoded demo route resolving the seeded `acme-dev` org; needs real `/org/[orgSlug]/project/[projectKey]/board/[boardId]` routing)
- [ ] Org switcher + create-org flow
- [ ] Project list / dashboard shell (RSC-rendered nav + project list)
- [x] Epic list / roadmap view (`/epics` — epics with owner, status, target date, task count, inline create form)
- [x] Sprint planning view (`/sprints` — sprint list, goal/dates/task count, start/complete actions, inline create form)
- [ ] Timeline/Gantt-style view (task start/due dates across a sprint or epic)
- [x] Task detail panel/modal (`src/components/board/task-panel.tsx` — description, comments w/ post form, owner, assignee, epic, sprint, start/due date; subtasks list is read-only so far)
- [x] Activity feed view (`/activity` — chronological, per-type icon, human-readable event descriptions via `describeActivityEvent`)
- [ ] GitHub connect / repo-linking settings page
- [ ] Empty states + loading skeletons

### Frontend logic

- [x] TanStack Query provider + tRPC client setup (`src/components/providers.tsx`)
- [x] Optimistic update flow for `task.move` (`src/hooks/use-move-task.ts`)
- [x] Zustand board store (drag target, active task, assignee filter, open task panel id)
- [x] Drag-and-drop implementation (`@dnd-kit`) wired to `task.move`, incl. position-ghost chip showing the computed fractional index
- [x] Framer Motion layout animations for card reorder/move
- [ ] Epic/sprint filter controls on the board (filter cards by epic or sprint)
- [x] Labels editing UI on the task panel (add via input + Enter, remove via chip's × button, `task.setLabels`)
- [x] Drag tasks between backlog and a sprint (`/backlog` — `sprint.planningBoard` query, `use-assign-sprint.ts` optimistic hook, `PlanningBoard`/`PlanningCard` components)
- [ ] Keyboard shortcuts (nice-to-have, cheap polish)

### Polish / portfolio extras

- [ ] Public read-only demo mode (seeded org, no sign-up required)
- [ ] README screenshots/GIF of the board in action

### Gaps vs. a real-world Kanban/PM tool

Identified but not yet built — roughly ordered by portfolio impact:

- [ ] Swimlanes (group board rows by epic/assignee/priority)
- [x] WIP limits actually enforced on drop — blocked with a red column highlight + toast message, checked against the true (unfiltered) column state so an active label filter can't be used to sneak past the limit; seed sets "In Progress" to a limit of 1 so it's demonstrable immediately
- [ ] Column management UI (create/rename/reorder/delete columns and boards)
- [ ] Quick-add task inline on the board (type a title, hit enter)
- [x] Story points / estimation on tasks (`storyPoints` column, editable in the task panel, shown on Kanban and planning cards)
- [x] Sprint burndown/velocity chart (`/burndown` — `sprint.burndown` query, recharts line chart, ideal-vs-actual; completion date is approximated from `task.updatedAt` when the task's current column is "Done" — see the caveat noted in `sprint.ts`, a task moved back out of Done loses its true completion date under this heuristic)
- [ ] Backlog ordering (explicit priority order, not just creation order)
- [ ] Epic progress bar (done/total, not just task count)
- [x] Labels/tags UI (deterministic per-label color, add/remove in task panel, filter bar on the board — OR-match across selected labels)
- [ ] Real-time presence + live board sync across users
- [ ] @mentions + notifications
- [ ] Search and quick filters (my tasks, unassigned, by label)
- [ ] Table/list view as an alternative to the board
- [ ] Undo, and archive-vs-delete distinction (deletes are currently hard deletes)
- [ ] Large-board virtualization


