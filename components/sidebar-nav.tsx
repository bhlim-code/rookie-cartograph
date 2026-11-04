"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview", exact: true },
  { href: "/#members", label: "Members", exact: false },
] as const;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Workspace" className="flex flex-col gap-0.5 p-2">
      <p className="px-2 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
        Workspace
      </p>
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-8 items-center rounded-md px-2 text-[13px] transition-colors ${
              active
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:bg-surface-raised hover:text-foreground"
            }`}
            href={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
