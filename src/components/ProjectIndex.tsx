import { useMemo, useState } from "react";

export interface IndexProject {
  slug: string;
  name: string;
  summary: string;
  tags: string[];
}

/** Filter key: "web-design" and "web design" are the same tag. Display keeps the bundle's own spelling. */
export const tagKey = (t: string) => t.toLowerCase().replace(/-/g, " ");

/**
 * The project index: a text filter (MOUTHWASH-style) beside numbered matted plates.
 * Every plate is server-rendered; filtering only toggles `hidden`, so the list reads in full without JS.
 * Only tags shared by two or more projects become filters; the rest stay on the plates.
 */
export default function ProjectIndex({ projects }: { projects: IndexProject[] }) {
  const [tag, setTag] = useState<string | null>(null);
  const filters = useMemo(() => {
    const count = new Map<string, number>();
    projects.forEach((p) => new Set(p.tags.map(tagKey)).forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
    return [...count].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [projects]);
  const matches = (p: IndexProject) => !tag || p.tags.some((t) => tagKey(t) === tag);
  const shown = projects.filter(matches).length;
  if (!projects.length) return <p className="note">No plates placed yet.</p>;

  // A filter with nothing to choose (no tag shared by two projects) is left out.
  return (
    <div className={`grid gap-x-12 gap-y-8 ${filters.length ? "md:grid-cols-[10rem_1fr]" : ""}`}>
      {filters.length > 0 && (
        <div className="md:sticky md:top-[104px] md:self-start">
          <h3 id="filter-label" className="label mb-3">Filter</h3>
          <ul aria-labelledby="filter-label" className="flex flex-wrap gap-x-5 md:flex-col">
            <li>
              <FilterButton active={tag === null} count={projects.length} onClick={() => setTag(null)}>
                All
              </FilterButton>
            </li>
            {filters.map(([t, n]) => (
              <li key={t}>
                <FilterButton active={tag === t} count={n} onClick={() => setTag(tag === t ? null : t)}>
                  {t}
                </FilterButton>
              </li>
            ))}
          </ul>
          <p className="sr-only" aria-live="polite">
            {tag ? `Showing ${shown} of ${projects.length} projects tagged ${tag}` : ""}
          </p>
        </div>
      )}

      <ol className="grid gap-[clamp(12px,1.4vw,16px)]">
        {projects.map((p, i) => (
          <li key={p.slug} hidden={!matches(p)} className="plate-item">
            <a href={`/tech/${p.slug}`} className="mat lift develop group grid gap-x-[var(--mat-sm)] p-[var(--mat-sm)] sm:grid-cols-[3.25rem_1fr]">
              <span aria-hidden="true" className="hidden pt-[clamp(18px,2.4vw,26px)] text-right sm:block">
                <span className="title block text-[1.75rem] leading-none text-pencil tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              </span>
              <div className="window grid gap-2.5 px-[clamp(18px,2.4vw,28px)] py-[clamp(16px,2vw,24px)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid gap-1.5">
                    <span className="label sm:hidden">Plate {String(i + 1).padStart(2, "0")}</span>
                    <h3 className="title text-[clamp(1.25rem,2.2vw,1.6rem)] text-foreground">{p.name}</h3>
                  </div>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="arrow mt-0.5 size-5 shrink-0 text-pencil" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </div>
                <p className="max-w-[60ch] text-pretty text-muted-text">{p.summary}</p>
                <ul className="tags label pt-1" aria-label="Tags">
                  {p.tags.map((t) => (
                    <li key={t} className={tagKey(t) === tag ? "!text-tech" : undefined}>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FilterButton({ active, count, onClick, children }: { active: boolean; count: number; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex min-h-10 items-center gap-2 text-left text-[0.95rem] transition-colors duration-200 hover:text-foreground ${
        active ? "text-foreground" : "text-muted-text"
      }`}
    >
      <span aria-hidden="true" className={`h-px transition-[width,background-color] duration-200 ease-out ${active ? "w-4 bg-tech" : "w-2 bg-pencil/40"}`} />
      <span>{children}</span>
      <span className="self-start text-[0.75rem] font-medium text-pencil tabular-nums">{count}</span>
    </button>
  );
}
