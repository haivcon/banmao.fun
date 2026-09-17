'use client';
import { useLayoutEffect, useRef, type SVGProps } from 'react';
// Animation is entirely in the contract-generated SMIL markup.

type Props = Omit<SVGProps<SVGSVGElement>, 'children' | 'dangerouslySetInnerHTML'> & { markup: string };

export default function KingAnimatedSvg({ markup, ...props }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  // One owner for the SVG subtree. React updates root props (zoom/labels), never
  // reassigns innerHTML over live particles on an unrelated parent render.
  useLayoutEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    svg.innerHTML = markup;
    return () => {
      svg.replaceChildren();
    };
  }, [markup]);
  return <svg {...props} ref={ref} />;
}
