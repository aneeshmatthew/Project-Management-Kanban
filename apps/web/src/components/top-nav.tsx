import Link from "next/link";

const links = [
  { href: "/board", label: "Board" },
  { href: "/list", label: "List" },
  { href: "/backlog", label: "Backlog" },
  { href: "/epics", label: "Epics" },
  { href: "/sprints", label: "Sprints" },
  { href: "/burndown", label: "Burndown" },
  { href: "/activity", label: "Activity" },
];

export function TopNav() {
  return (
    <nav className="flex items-center gap-4 border-b border-border bg-panel px-4 py-2">
      <span className="font-mono text-xs text-muted">PM Tool</span>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-sm text-muted hover:text-ink"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
