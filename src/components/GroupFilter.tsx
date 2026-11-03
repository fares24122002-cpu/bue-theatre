import Link from "next/link";
import { LANGUAGES, LANGUAGE_LABEL, isLanguage, type Language } from "@/lib/types";

/** Reads ?group=english|arabic from a page's search params. */
export function readGroupFilter(
  sp: Record<string, string | string[] | undefined>,
): Language | null {
  const v = Array.isArray(sp.group) ? sp.group[0] : sp.group;
  return isLanguage(v) ? v : null;
}

/** All / English / Arabic links for staff pages. */
export function GroupFilter({ base, current }: { base: string; current: Language | null }) {
  const items: { key: Language | null; label: string }[] = [
    { key: null, label: "All" },
    ...LANGUAGES.map((l) => ({ key: l, label: LANGUAGE_LABEL[l] })),
  ];
  return (
    <nav className="filter-row" aria-label="Filter by group">
      {items.map((i) => (
        <Link
          key={i.label}
          href={i.key ? `${base}?group=${i.key}` : base}
          className={`filter-chip${current === i.key ? " is-on" : ""}`}
          aria-current={current === i.key ? "page" : undefined}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
