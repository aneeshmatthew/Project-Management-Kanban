# PM Tool — Developer-Focused Project Management - Kanban board

A Trello/Linear-style project management tool built to showcase a modern
full-stack TypeScript architecture: Next.js App Router + RSC, tRPC,
Drizzle/Postgres, and a GitHub sync integration that mirrors issues and
comments into tasks in real time via webhooks.

## Stack

- **Web:** Next.js (App Router, RSC), React 19
- **Monorepo:** Turborepo
- **Data/state:** tRPC, TanStack Query, Zustand
- **DB:** PostgreSQL (Neon) via Drizzle ORM
- **UI:** Tailwind CSS, class-variance-authority, Framer Motion
- **Mobile:** deferred — see `apps/mobile/README.md`

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
npm run dev
```

---

## Project tracker

Check items off as they're built. Update this file directly as work lands.

### Foundation / infra

- [x] Turborepo scaffold (`apps/web`, `apps/mobile` placeholder, `packages/api`, `packages/db`, `packages/ui`)
- [x] Drizzle schema (orgs, projects, boards, columns, tasks, comments, attachments, activity, GitHub integration)
- [x] tRPC base setup (context, `protectedProcedure`, `projectProcedure` permission middleware)
- [x] `project` router (list, create, connectGithubRepo, addMember)
- [x] `task` router (create, move w/ fractional indexing, assign)
- [x] `github` router + webhook route (signature verification, issue/comment sync)
- [ ] Auth provider chosen and wired (`apps/web/src/lib/auth.ts` referenced but not implemented)
- [ ] Database migrated against a real Neon instance (`db:generate` + `db:migrate` run)
- [ ] Seed script (sample org, project, board, columns, tasks) for local dev
- [ ] GitHub App registered (real `GITHUB_APP_SLUG`, per-installation webhook secrets wired to `githubIntegrations.webhookSecret` instead of one global env var)
- [ ] Real "system/GitHub" user row for comment attribution (currently stubbed)
- [ ] Vercel project connected, Root Directory set to `apps/web`, Turborepo remote caching confirmed
- [ ] Neon database provisioned for production

### Pages / screens

- [ ] Sign in / sign up
- [ ] Org switcher + create-org flow
- [ ] Project list / dashboard shell (RSC-rendered nav + project list)
- [ ] Board view (Kanban columns, cards)
- [ ] Task detail panel/modal (description, comments, assignee, labels, subtasks)
- [ ] Activity feed view
- [ ] GitHub connect / repo-linking settings page
- [ ] Empty states + loading skeletons

### Frontend logic

- [ ] TanStack Query provider + client setup in `apps/web`
- [ ] Optimistic update flow for `task.move` (drag-and-drop)
- [ ] Zustand stores (drag state, active filters, open panel/modal id)
- [ ] Drag-and-drop implementation wired to `task.move`
- [ ] Framer Motion layout animations for card reorder/move
- [ ] Keyboard shortcuts (nice-to-have, cheap polish)

### Polish / portfolio extras

- [ ] Public read-only demo mode (seeded org, no sign-up required)
- [ ] README screenshots/GIF of the board in action
