export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="h-20 animate-pulse rounded-xl border border-border/70 bg-surface-1" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-56 animate-pulse rounded-xl border border-border/70 bg-surface-1 lg:col-span-2" />
        <div className="h-56 animate-pulse rounded-xl border border-border/70 bg-surface-1" />
      </div>
    </div>
  );
}
