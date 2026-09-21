"use client";
import { useId, useState, type ReactNode } from 'react';

/** Mobile disclosure keeps full addresses available without a nested scroll area. */
export default function KingExpandableList({ children, count, className, vi }: { children: ReactNode; count: number; className: string; vi: boolean }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  return <div className="king-expandable-list" data-expanded={expanded}>
    <ul id={id} className={className}>{children}</ul>
    {count > 3 && <button type="button" className="king-recipient-tool king-mobile-disclosure" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>
      {expanded ? (vi ? 'Thu gọn' : 'Show less') : `${vi ? 'Xem tất cả' : 'Show all'} (${count})`}
    </button>}
  </div>;
}
