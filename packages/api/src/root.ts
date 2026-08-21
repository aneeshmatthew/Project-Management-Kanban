import { router } from "./trpc";
import { projectRouter } from "./routers/project";
import { taskRouter } from "./routers/task";
import { githubRouter } from "./routers/github";
import { boardRouter } from "./routers/board";
import { organizationRouter } from "./routers/organization";
import { epicRouter } from "./routers/epic";
import { sprintRouter } from "./routers/sprint";
import { activityRouter } from "./routers/activity";

export const appRouter = router({
  project: projectRouter,
  task: taskRouter,
  github: githubRouter,
  board: boardRouter,
  organization: organizationRouter,
  epic: epicRouter,
  sprint: sprintRouter,
  activity: activityRouter,
});

export type AppRouter = typeof appRouter;
