"use client";

import { useActionState, useEffect, useRef } from "react";

import { inviteMember, type InviteState } from "@/app/(workspace)/action";

const initialState: InviteState = { status: "idle", message: "" };

export function InviteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    inviteMember,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-3" ref={formRef}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">
            Email address
          </span>
          <input
            autoComplete="off"
            className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-[13px] outline-none placeholder:text-muted/70 focus:border-accent"
            name="email"
            placeholder="teammate@example.com"
            required
            type="email"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted">
            Role
          </span>
          <select
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-[13px] outline-none focus:border-accent"
            defaultValue="org:member"
            name="role"
          >
            <option value="org:member">Member</option>
            <option value="org:admin">Admin</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-[13px] font-medium text-accent-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Sending…" : "Send invitation"}
        </button>
        <p className="text-[11px] text-muted">
          The invitation redirects to this app&apos;s sign-in page.
        </p>
      </div>

      {state.status !== "idle" && state.message && (
        <p
          aria-live="polite"
          className={`rounded-md border px-3 py-2 text-[12px] ${
            state.status === "success"
              ? "border-incoming/30 bg-incoming/10 text-incoming"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
