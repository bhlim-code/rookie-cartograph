import Link from "next/link";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2.75" y="2.75" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect
        x="14.25"
        y="14.25"
        width="7"
        height="7"
        rx="1.5"
        fill="currentColor"
        opacity="0.45"
      />
      <path
        d="M9.75 6.25h3.5a3.5 3.5 0 0 1 3.5 3.5v4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <circle cx="16.75" cy="6.25" r="1.75" fill="currentColor" />
    </svg>
  );
}

export function Brand({
  compact = false,
  href = "/",
}: {
  compact?: boolean;
  href?: string;
}) {
  return (
    <Link
      className="group flex items-center gap-2 text-foreground"
      href={href}
    >
      <span className="grid size-7 place-items-center rounded-md border border-border bg-surface text-accent shadow-[0_1px_0_rgb(0_0_0/0.03)]">
        <BrandMark className="size-4" />
      </span>
      {!compact && (
        <span className="text-[13px] font-semibold tracking-[-0.01em]">
          Cartograph
        </span>
      )}
    </Link>
  );
}
