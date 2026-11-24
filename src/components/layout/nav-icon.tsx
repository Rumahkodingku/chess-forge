import type { NavIconName } from "@/lib/navigation";

interface NavIconProps {
  name: NavIconName;
  className?: string;
}

export function NavIcon({ name, className }: NavIconProps) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };

  if (name === "dashboard") {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="3" width="5.5" height="5.5" rx="1" />
        <rect x="11.5" y="3" width="5.5" height="5.5" rx="1" />
        <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" />
        <path d="M11.5 14.2h5.5M14.25 11.5v5.5" />
      </svg>
    );
  }

  if (name === "analysis") {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <path d="M3 10h14M10 3v14" opacity=".5" />
        <circle cx="12.5" cy="8" r="2.5" />
        <path d="m14.3 9.8 2.2 2.2" />
      </svg>
    );
  }

  if (name === "studio") {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="4" width="14" height="12" rx="2" />
        <path d="M7 4v12M13 4v12M3 8h4M3 12h4M13 8h4M13 12h4" opacity=".65" />
        <path d="m8.5 8 3 2-3 2V8Z" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === "library") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M4 4.5h5.5A2.5 2.5 0 0 1 12 7v9.5H6.5A2.5 2.5 0 0 1 4 14V4.5Z" />
        <path d="M16 4.5h-2.5A1.5 1.5 0 0 0 12 6v10.5h2.5A1.5 1.5 0 0 0 16 15V4.5Z" />
        <path d="M7 8h2M7 11h2" opacity=".65" />
      </svg>
    );
  }

  if (name === "templates") {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="5" width="10" height="12" rx="1.6" />
        <path d="M7 3h8.5A1.5 1.5 0 0 1 17 4.5V13" />
        <path d="M6 9h4M6 12h4" opacity=".65" />
      </svg>
    );
  }

  return (
    <svg {...common} aria-hidden="true">
      <path d="M4 6h12M4 10h12M4 14h12" opacity=".55" />
      <circle cx="7" cy="6" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="13" cy="10" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="8" cy="14" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  );
}
