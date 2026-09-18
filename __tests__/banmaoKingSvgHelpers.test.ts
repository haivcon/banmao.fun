import { expectSvgReferences, svgGroupByClass, svgGroups } from './helpers/banmaoKingSvg';

describe('BanmaoKing SVG test helpers', () => {
  test.each(['<path/>', '<g><path/></g><g><path/></g>'])('isolates flat or nested groups from animated siblings: %s', content => {
    const group = `<g class="detail king-whiskers">${content}</g>`;
    const svg = `<g id="expression">${group}<g><animate attributeName="opacity"/></g></g>`;
    expect(svgGroupByClass(svg, 'king-whiskers')).toEqual({ tag: '<g class="detail king-whiskers">', parent: '<g id="expression">', markup: group });
  });
  test('handles comments and self-closing groups', () => {
    expect(svgGroups('<g><!-- <g> --><g/></g>')).toHaveLength(1);
  });
  test.each(['</g>', '<g>'])('rejects unbalanced groups: %s', svg => {
    expect(() => svgGroups(svg)).toThrow();
  });
  test.each(['<g/>', '<g class="x"></g><g class="x"></g>'])('rejects missing or ambiguous selections: %s', svg => {
    expect(() => svgGroupByClass(svg, 'x')).toThrow();
  });
  test('checks local href and paint references', () => {
    expectSvgReferences('<g id="a"/><use href="#a"/><path fill="url(#a)"/>');
    expect(() => expectSvgReferences('<use href="#missing"/>')).toThrow();
    expect(() => expectSvgReferences('<path fill="url(#missing)"/>')).toThrow();
    expect(() => expectSvgReferences('<g id="a"/><g id="a"/>')).toThrow();
  });
});
