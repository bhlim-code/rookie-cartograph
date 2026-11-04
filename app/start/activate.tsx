"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Brand } from "@/components/brand";

import { resolveOrganization } from "./action";

type ActivateState =
  | { kind: "working"; message: string }
  | { kind: "error"; message: string };

function errorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray(error.errors)
  ) {
    const first = error.errors[0] as { longMessage?: string; message?: string };
    return first.longMessage || first.message || "Could not set up your workspace.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Could not set up your workspace. Try again.";
}

export function Activate() {
  const clerk = useClerk();
  const { isLoaded } = useAuth({ treatPendingAsSignedOut: false });
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ActivateState>({
    kind: "working",
    message: "Reading your account…",
  });
  const running = useRef(false);
  const mounted = useRef(true);

  // `setActive` resets Clerk's client state, which can re-run the effect below.
  // The organization switch is still in flight at that point, so cleanup must
  // only react to a real unmount, not to a dependency change.
  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    async function enterOrganization() {
      if (running.current || !mounted.current) {
        return;
      }

      running.current = true;

      try {
        setState({
          kind: "working",
          message: "Resolving your organization…",
        });

        const result = await resolveOrganization();

        if (!mounted.current) {
          return;
        }

        if (!result.ok) {
          setState({ kind: "error", message: result.message });
          running.current = false;
          return;
        }

        setState({
          kind: "working",
          message: "Opening your workspace…",
        });

        if (!clerk.user) {
          throw new Error("Your session is no longer signed in.");
        }

        // The organization was created through the backend API, so refresh the
        // client copy before making it the active organization.
        await clerk.user.reload();
        await clerk.setActive({ organization: result.organizationId });

        if (mounted.current) {
          // Do not call router.refresh() here: refreshing the current route
          // cancels the replace, leaving the person on this screen even though
          // the session is already active.
          router.replace("/");
        }
      } catch (error) {
        if (mounted.current) {
          setState({ kind: "error", message: errorMessage(error) });
          running.current = false;
        }
      }
    }

    void enterOrganization();
  }, [attempt, clerk, isLoaded, router]);

  function retry() {
    running.current = false;
    setState({ kind: "working", message: "Trying again…" });
    setAttempt((value) => value + 1);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-4">
        <Brand href="/" />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
            First sign-in
          </p>
          <h1 className="mt-2 text-lg font-semibold tracking-[-0.01em]">
            Setting up your workspace
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            Every account belongs to an organization. You will not be asked to
            create one by hand.
          </p>

          <div className="mt-6 rounded-md border border-border bg-background px-3 py-2.5">
            <p className="flex items-center gap-2 text-[13px]">
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${
                  state.kind === "error" ? "bg-danger" : "bg-accent"
                }`}
              />
              <span
                aria-live="polite"
                className={state.kind === "error" ? "text-danger" : undefined}
              >
                {state.message}
              </span>
            </p>
          </div>

          {state.kind === "error" && (
            <div className="mt-4 flex items-center gap-3">
              <button
                className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-[13px] font-medium text-accent-foreground hover:opacity-90"
                onClick={retry}
                type="button"
              >
                Try again
              </button>
              <button
                className="text-[13px] text-muted hover:text-foreground"
                onClick={() => clerk.signOut({ redirectUrl: "/sign-in" })}
                type="button"
              >
                Sign out
              </button>
            </div>
          )}

          <ol className="mt-6 space-y-2 border-t border-border pt-4 text-[12px] text-muted">
            <li>1. Account confirmed by Clerk.</li>
            <li>2. First membership selected or created.</li>
            <li>3. Session switched to that organization.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
