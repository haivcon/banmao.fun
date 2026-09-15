import fs from 'node:fs';
import path from 'node:path';
import rig from '../app/collection/banmaoking/neutral-rig.json';
const read = (name: string) => fs.readFileSync(path.join(process.cwd(), 'app/collection/banmaoking', name), 'utf8');

describe('compact studio and feline anatomy', () => {
  it('keeps one attached wrist per side and no duplicate foreground paws', () => {
    expect(rig.front).toBe('');
    for (const side of ['left', 'right']) {
      expect(rig.rear.split(`id="smil-king-wrist-${side}"`)).toHaveLength(2);
      for (const state of ['relaxed', 'open', 'cupped']) expect(rig.rear).toContain(`id="king-paw-${state}-${side}"`);
    }
    expect(rig.rear).not.toContain('C-10-33 4-34 5-22');
    expect(rig.rear.split('M-17 5C-21-1-21-10-16-14')).toHaveLength(3);
    expect(rig.rear.split('class="king-paw-pads" transform="scale(.76)"')).toHaveLength(3);
    expect(rig.rear).not.toContain('L-21 449L-18 460');
    expect(rig.rear.split('M-14 419C-16 434-14 450-18 460')).toHaveLength(3);
    expect(rig.rear).toContain('M164 302C154 312 143 325 131 339');
    expect(rig.rear).toContain('M348 302C358 312 369 325 381 339');
    expect(rig.rear).toContain('translate(143 357)');
    expect(rig.rear).toContain('translate(369 357)');
    expect(rig.rear).not.toContain('translate(143 380)');
    expect(rig.rear).not.toContain('translate(369 380)');
    expect(rig.rear).not.toContain('C142 313 123 333 125 352');
    expect(rig.rear).not.toContain('C370 313 389 333 387 352');
  });
  it('exposes keyboard tabs and collapsible sharing within the studio', () => {
    const source = read('KingExperience.tsx');
    expect(source).toContain('role="tablist"');
    expect(source).toContain('aria-controls=');
    expect(source).toContain("event.key === 'ArrowRight'");
    expect(source).toContain('hidden={activeGroup !== groupIndex}');
    expect(source).toContain('king-composition-drawer');
  });
  it('uses a native modal, restores focus, bounds zoom and scopes SVG IDs', () => {
    const source = read('KingSvgViewer.tsx');
    for (const fragment of ['showModal()', 'onClose=', 'trigger.current?.focus()', 'Math.min(4', 'Math.max(1', '`${prefix}-zoom`', 'download=']) expect(source).toContain(fragment);
  });
});
