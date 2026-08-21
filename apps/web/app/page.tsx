import { Button } from "@repo/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">PM Tool</h1>
        <p className="text-slate-500">Developer-focused project management, with GitHub sync.</p>
        <Button>Get started</Button>
      </div>
    </main>
  );
}
