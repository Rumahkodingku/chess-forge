import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-md rounded-xl border border-border bg-surface-1 p-6">
        <p className="text-[11px] font-medium text-brand">404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
          That page is not in this workspace.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The route may belong to a later phase. Return to the dashboard and
          continue from a destination that exists.
        </p>
        <Button asChild className="mt-5">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
