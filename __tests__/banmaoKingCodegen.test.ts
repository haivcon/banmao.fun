import fs from 'node:fs';
import path from 'node:path';
import profiles from '../app/collection/banmaoking/choreography.json';

// Generator is CommonJS because it also runs directly under Node.
const { contract, concatExpression } = jest.requireActual('../tools/king-svg-codegen.cjs');

test('concat generator preserves order, escaping, empty strings and arity', () => {
  expect(concatExpression([])).toBe('""');
  expect(concatExpression(['"a"'])).toBe('"a"');
  expect(concatExpression(['a', 'b', 'c', 'd', 'e', 'f'])).toBe('string.concat(string.concat(a,b,c,d,e),f)');
  expect(concatExpression(['a', 'b', 'c', 'd'], 3)).toBe('string.concat(string.concat(a,b,c),d)');
});

test.each([0, 1, -1, 1.5, NaN, Infinity])('rejects unsafe concat arity %s instead of looping forever', arity => {
  expect(() => concatExpression(['a', 'b'], arity)).toThrow(RangeError);
});

test('only exact repeated tags are interned and trait routing is preserved', () => {
  const tag = '<animate attributeName="opacity" values="0;.8;0" dur="4s" repeatCount="indefinite"/>';
  const other = tag.replace('4s', '5s');
  const source = contract('Example', [[3, tag + other + tag], [9, '']]);
  expect(source).toContain(`if(id==3)return string.concat(_s0(),${JSON.stringify(other)},_s0());`);
  expect(source).toContain(`return ${JSON.stringify(tag)};`);
  expect(source).toContain('if(id==9)return "";');
  expect(source).toContain('revert InvalidTrait();');
  expect(source).not.toContain('_s1');
});

test('interned backgrounds reconstruct every authored byte and retain royal routing', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'contracts/BanmaoKing/Lib/BanmaoKingBackgroundExpansion.sol'), 'utf8');
  const catalogue = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app/collection/banmaoking/expansion.json'), 'utf8'));
  const { sceneGroups } = jest.requireActual('../tools/king-background-codegen.cjs');
  catalogue.backgrounds.forEach((entry: { svg: string; name: string }, index: number) => {
    const id = index + 8;
    if (id === 14) {
      expect(source).toContain('return BanmaoKingSakuraGarden.render();');
      expect(source).toContain('// BEGIN CANONICAL SakuraGarden');
      return; // Exact Solidity/EVM bytes are checked by sync-king-sakura-garden --check.
    }
    if (id === 16) return; // Royal output is owned by its existing dedicated renderer.
    const partIndex = sceneGroups.findIndex((ids: number[]) => ids.includes(id));
    const part = source.split(`contract BanmaoKingBackgroundExpansionPart${partIndex} {`)[1].split('\ncontract ')[0];
    const helpers = new Map<string, string>();
    for (const match of part.matchAll(/function (_s\d+)\(\) private pure returns\(string memory\)\{return ("(?:[^"\\]|\\.)*");\}/g)) {
      helpers.set(match[1], JSON.parse(match[2]));
    }
    const expression = part.match(new RegExp(`if\\(id==${id}\\)return (.*);`))?.[1];
    expect(expression).toBeDefined();
    const tokens = expression!.match(/"(?:[^"\\]|\\.)*"|_s\d+\(\)/g) || [];
    const actual = tokens.map(token => token.startsWith('"') ? JSON.parse(token) : helpers.get(token.slice(0, -2))).join('');
    expect(actual).toBe(entry.svg);
    expect(source).toContain(`if(id==${id}) return ${JSON.stringify(entry.name)};`);
  });
  expect(source).toContain('if(id==16)return royal.render();');
  expect(source).toContain('if (id == 16) return BanmaoKingRoyalLib.BACKGROUND_NAME;');
});

test.each(profiles.map((profile, id) => [id, profile.duration] as const))(
  'secondary part %i owns only its duration %s', (id, duration) => {
    const source = fs.readFileSync(path.join(process.cwd(), 'contracts/BanmaoKing/Lib/BanmaoKingSecondaryMotion.sol'), 'utf8');
    const part = source.split(`contract BanmaoKingSecondaryMotion${id} {`)[1].split('\ncontract ')[0];
    expect(part).toContain(`if(id!=${id})revert InvalidTrait();`);
    expect(part).toContain(`string memory duration=${JSON.stringify(duration)};`);
    expect(part).not.toContain('string[21] memory durations');
    expect(part).not.toContain('__DURATION__');
  }
);
