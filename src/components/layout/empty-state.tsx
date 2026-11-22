import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-44 flex-col items-start justify-center rounded-xl border border-dashed border-border/90 bg-surface-1/40 p-5",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 flex size-9 items-center justify-center rounded-lg border border-border/80 bg-surface-2 text-brand">
          {icon}
        </div>
      ) : null}
      <h2 className="text-[14px] font-medium tracking-[-0.01em] text-foreground">
        {title}
      </h2>
      <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
