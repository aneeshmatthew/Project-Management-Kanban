import { router } from "./trpc";
import { projectRouter } from "./routers/project";
import { taskRouter } from "./routers/task";
import { githubRouter } from "./routers/github";

export const appRouter = router({
  project: projectRouter,
  task: taskRouter,
  github: githubRouter,
});

export type AppRouter = typeof appRouter;
