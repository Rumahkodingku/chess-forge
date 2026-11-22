import Link from "next/link";

export function BrandMark() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="ChessForge dashboard"
    >
      <span className="flex size-9 items-center justify-center rounded-[10px] bg-brand text-brand-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
        {/* biome-ignore lint/performance/noImgElement: local SVG mark, no optimisation needed */}
        <img
          src="/pieces/cburnett/wN.svg"
          alt=""
          width={21}
          height={21}
          aria-hidden
        />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
          ChessForge
        </span>
        <span className="mt-1 text-[11px] text-muted-foreground">
          Local chess studio
        </span>
      </span>
    </Link>
  );
}
