import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface IndexProject {
  slug: string;
  name: string;
  summary: string;
  tags: string[];
}

/** The project index: a text tag filter on the left (MOUTHWASH-style), numbered rows on the right. */
export default function ProjectIndex({ projects }: { projects: IndexProject[] }) {
  const [tag, setTag] = useState<string | null>(null);
  const tags = useMemo(() => {
    const count = new Map<string, number>();
    projects.forEach((p) => p.tags.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
    return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [projects]);
  const shown = tag ? projects.filter((p) => p.tags.includes(tag)) : projects;

  return (
    <div className="grid gap-8 md:grid-cols-[11rem_1fr]">
      <nav aria-label="Filter by tag" className="md:sticky md:top-20 md:self-start">
        <p className="label mb-3">Tags</p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm md:flex-col md:gap-1">
          <li>
            <TagButton active={tag === null} onClick={() => setTag(null)}>
              All <span className="text-pencil">{projects.length}</span>
            </TagButton>
          </li>
          {tags.map(([t, n]) => (
            <li key={t}>
              <TagButton active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                {t} <span className="text-pencil">{n}</span>
              </TagButton>
            </li>
          ))}
        </ul>
      </nav>

      <ol className="grid gap-3" aria-live="polite">
        {shown.map((p) => (
          <li key={p.slug}>
            <a href={`/tech/${p.slug}`} className="group block focus-visible:outline-none">
              <Card className="relative overflow-hidden px-5 py-5 transition-colors group-hover:border-tech/40 group-focus-visible:border-tech sm:px-6">
                <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-tech/0 transition-colors group-hover:bg-tech" />
                <div className="flex items-start gap-5">
                  <span className="title hidden w-10 shrink-0 text-2xl text-pencil tabular-nums sm:block">
                    {String(projects.indexOf(p) + 1).padStart(2, "0")}
                  </span>
                  <div className="grid min-w-0 flex-1 gap-2">
                    <h3 className="title text-xl text-foreground sm:text-2xl">{p.name}</h3>
                    <p className="max-w-prose text-muted-foreground">{p.summary}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {p.tags.map((t) => (
                        <Badge key={t} variant="outline" className={cn("rounded-sm font-normal", t === tag && "border-tech/60 text-tech")}>
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <ArrowUpRight className="mt-1 size-5 shrink-0 text-pencil transition-colors group-hover:text-tech" />
                </div>
              </Card>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TagButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-sm py-0.5 text-left lowercase transition-colors hover:text-foreground focus-visible:text-tech focus-visible:outline-none",
        active ? "text-tech" : "text-muted-foreground",
      )}
    >
      {active && <span aria-hidden className="mr-1">▪</span>}
      {children}
    </button>
  );
}
