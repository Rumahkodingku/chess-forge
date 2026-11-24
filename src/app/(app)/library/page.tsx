import {
  ArrowRight,
  BookOpen,
  Brain,
  Library,
  Swords,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LibrarySearch } from "@/features/library/components/library-search";

const areas = [
  {
    href: "/library/openings",
    label: "Openings",
    description: "Explore named lines, counters, and engine alternatives.",
    Icon: Library,
  },
  {
    href: "/library/repertoire",
    label: "Repertoire",
    description: "Save the lines you want to play and keep notes.",
    Icon: BookOpen,
  },
  {
    href: "/library/practice",
    label: "Practice",
    description: "Train tactics, repertoire moves, and opening recall.",
    Icon: Brain,
  },
  {
    href: "/library/games",
    label: "My Games",
    description: "Find patterns and mistakes in your own analysed games.",
    Icon: UserRound,
  },
  {
    href: "/library/reference",
    label: "Reference",
    description: "Read original strategy, tactics, and endgame articles.",
    Icon: Swords,
  },
];

export default function LibraryPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Chess Library"
        description="A local study workspace for openings, repertoire, tactics, and the lessons inside your own games. Everything here works offline."
      />
      <LibrarySearch />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map(({ href, label, description, Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full border-border/80 bg-surface-1 transition-colors group-hover:border-border-strong">
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg border border-border/80 bg-surface-2 text-brand">
                  <Icon aria-hidden className="size-4" />
                </div>
                <CardTitle className="flex items-center justify-between text-[15px]">
                  {label}
                  <ArrowRight
                    aria-hidden
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  />
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
