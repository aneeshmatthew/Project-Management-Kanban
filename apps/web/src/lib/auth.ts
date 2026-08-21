import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "@repo/db";
import { users } from "@repo/db/schema";
import { eq } from "drizzle-orm";

/**
 * We deliberately don't use the Drizzle Auth.js adapter here — it expects
 * `accounts` / `sessions` / `verificationTokens` tables we don't otherwise
 * need, since we're using JWT sessions rather than database sessions.
 * Instead, `signIn` upserts directly into our own `users` table (the same
 * one referenced by `tasks.assigneeId`, `comments.authorId`, etc.), and
 * `jwt`/`session` callbacks carry the internal user id forward.
 *
 * Note: this is a separate GitHub OAuth App from the GitHub App used for
 * issue/PR sync (see packages/api/src/routers/github.ts). One authenticates
 * platform users; the other is installed on repos for webhook sync. Do not
 * reuse credentials between them.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, profile }) {
      if (!user.email) {
        // GitHub accounts can have a private/no public email — reject
        // rather than creating an unlinkable user record.
        return false;
      }

      const existing = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.email, user.email!),
      });

      if (!existing) {
        await db.insert(users).values({
          email: user.email,
          name: user.name ?? profile?.name ?? null,
          avatarUrl: user.image ?? null,
        });
      } else if (existing.name !== user.name || existing.avatarUrl !== user.image) {
        // Keep profile fields fresh on repeat sign-ins.
        await db
          .update(users)
          .set({ name: user.name ?? existing.name, avatarUrl: user.image ?? existing.avatarUrl })
          .where(eq(users.id, existing.id));
      }

      return true;
    },

    async jwt({ token, user }) {
      // `user` is only present on initial sign-in; look up our internal
      // id by email and stash it in the token for subsequent requests.
      if (user?.email) {
        const dbUser = await db.query.users.findFirst({
          where: (u, { eq }) => eq(u.email, user.email!),
        });
        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId && session.user) {
        (session.user as typeof session.user & { id: string }).id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
});
