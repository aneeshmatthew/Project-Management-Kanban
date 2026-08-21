export interface ActivityEventLike {
  type: string;
  payload: Record<string, unknown> | null;
  actor: { name: string | null } | null;
  task: { title: string; number: number } | null;
}

export function describeActivityEvent(event: ActivityEventLike, projectKey: string): string {
  const actor = event.actor?.name ?? "Someone";
  const taskRef = event.task ? `${projectKey}-${event.task.number}` : "a task";
  const payload = event.payload ?? {};

  switch (event.type) {
    case "TASK_CREATED":
      return `${actor} created ${taskRef}`;
    case "TASK_MOVED":
      return `${actor} moved ${taskRef}`;
    case "TASK_ASSIGNED":
      return payload.assigneeId
        ? `${actor} assigned ${taskRef}`
        : `${actor} unassigned ${taskRef}`;
    case "TASK_UPDATED":
      if ("ownerId" in payload) return `${actor} changed the owner on ${taskRef}`;
      if ("startDate" in payload || "dueDate" in payload)
        return `${actor} updated the timeline on ${taskRef}`;
      return `${actor} updated ${taskRef}`;
    case "TASK_DELETED":
      return `${actor} deleted ${taskRef}`;
    case "COMMENT_ADDED":
      return `${actor} commented on ${taskRef}`;
    case "GITHUB_LINKED":
      return `${actor} linked ${taskRef} to a GitHub issue`;
    case "GITHUB_SYNCED":
      return `${taskRef} synced from GitHub`;
    case "MEMBER_ADDED":
      return `${actor} added a member to the project`;
    case "MEMBER_REMOVED":
      return `${actor} removed a member from the project`;
    case "EPIC_CREATED":
      return `${actor} created an epic`;
    case "SPRINT_STARTED":
      return `${actor} started a sprint`;
    case "SPRINT_COMPLETED":
      return `${actor} completed a sprint`;
    default:
      return `${actor} did something on ${taskRef}`;
  }
}
