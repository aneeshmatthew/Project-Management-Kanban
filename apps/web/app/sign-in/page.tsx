import { signIn } from "@/lib/auth";
import { Button } from "@repo/ui";

export default function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-2xl font-semibold">Sign in to PM Tool</h1>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: searchParams.callbackUrl ?? "/" });
          }}
        >
          <Button type="submit">Continue with GitHub</Button>
        </form>
      </div>
    </main>
  );
}
