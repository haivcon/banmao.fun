// Lightweight group traversal for authored SVG fragments in Jest's Node environment.
// This is not an XML validator; browser tests remain responsible for SVG parsing/rendering.
export function svgGroups(markup: string): { tag: string; parent?: string; markup: string }[] {
  const stack: { tag: string; start: number; parent?: string }[] = [];
  const groups: { tag: string; parent?: string; markup: string }[] = [];
  for (const match of markup.matchAll(/<!--[\s\S]*?-->|<g\b[^>]*>|<\/g\s*>/g)) {
    const tag = match[0];
    if (tag.startsWith('<!--')) continue;
    if (tag.startsWith('</')) {
      const open = stack.pop();
      if (!open) throw new Error('Unexpected closing SVG group');
      groups.push({ tag: open.tag, parent: open.parent, markup: markup.slice(open.start, match.index! + tag.length) });
    } else if (!tag.endsWith('/>')) {
      stack.push({ tag, start: match.index!, parent: stack.at(-1)?.tag });
    }
  }
  if (stack.length) throw new Error('Unclosed SVG group');
  return groups;
}

export function svgGroupByClass(markup: string, name: string) {
  const groups = svgGroups(markup).filter(group =>
    group.tag.match(/\bclass="([^"]*)"/)?.[1].split(/\s+/).includes(name));
  if (groups.length !== 1) throw new Error(`Expected one SVG group with class ${name}, found ${groups.length}`);
  return groups[0];
}

export function expectSvgReferences(markup: string): void {
  expect(markup).not.toMatch(/undefined|NaN/);
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  expect(new Set(ids).size).toBe(ids.length);
  const known = new Set(ids);
  for (const [, id] of markup.matchAll(/href="#([^"]+)"/g)) expect(known.has(id)).toBe(true);
  for (const [, id] of markup.matchAll(/url\(#([^)]*)\)/g)) expect(known.has(id)).toBe(true);
}
