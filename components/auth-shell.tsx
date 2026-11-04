import Link from "next/link";
import type { ReactNode } from "react";

import { Brand } from "./brand";

export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-4">
        <Brand href="/" />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
      <footer className="border-t border-border px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 text-[11px] text-muted">
          <span>Sessions are issued by Clerk. No second session layer.</span>
          <Link className="text-accent hover:underline" href="/sign-up">
            Create an account
          </Link>
        </div>
      </footer>
      {footer}
    </div>
  );
}
