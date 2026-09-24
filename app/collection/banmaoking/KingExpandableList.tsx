"use client";
import type { Lang } from './i18n';
import { kingControl } from './i18n/controls';
import { useId, useState, type ReactNode } from 'react';

/** Mobile disclosure keeps full addresses available without a nested scroll area. */
export default function KingExpandableList({ children, count, className, lang = 'en' }: { children: ReactNode; count: number; className: string; lang?: Lang }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  return <div className="king-expandable-list" data-expanded={expanded}>
    <ul id={id} className={className}>{children}</ul>
    {count > 3 && <button type="button" className="king-recipient-tool king-mobile-disclosure" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>
      {expanded ? (kingControl(lang, "Show less")) : `${kingControl(lang, "Show all")} (${count})`}
    </button>}
  </div>;
}
