export type NavIconName =
  | "dashboard"
  | "analysis"
  | "studio"
  | "library"
  | "templates"
  | "settings";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: NavIconName;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        description: "Your local workspace at a glance",
        icon: "dashboard",
      },
      {
        href: "/analysis",
        label: "Analysis",
        description: "Review games and engine lines",
        icon: "analysis",
      },
      {
        href: "/studio",
        label: "Studio",
        description: "Build and export chess videos",
        icon: "studio",
      },
    ],
  },
  {
    label: "Library",
    items: [
      {
        href: "/library",
        label: "Chess Library",
        description: "Study openings, repertoire, and tactics",
        icon: "library",
      },
      {
        href: "/templates",
        label: "Templates",
        description: "Reusable video directions",
        icon: "templates",
      },
      {
        href: "/settings",
        label: "Settings",
        description: "Defaults, storage, and browser capabilities",
        icon: "settings",
      },
    ],
  },
];

export const flatNavigation = navigation.flatMap((group) => group.items);

const extraTitles: Record<string, string> = {
  "/labs/export": "Export lab",
  "/labs/engine": "Engine lab",
  "/labs/pgn": "PGN lab",
};

export function titleForPath(pathname: string): string {
  const match = flatNavigation.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.label ?? extraTitles[pathname] ?? "ChessForge";
}
