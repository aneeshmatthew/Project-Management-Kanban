import { createTRPCContext } from "@repo/api/trpc";
import { auth } from "@/lib/auth"; // wire up to your auth provider (e.g. NextAuth)

export async function createContext() {
  const session = await auth();
  return createTRPCContext({
    session: session?.user?.id ? { userId: session.user.id } : null,
  });
}
