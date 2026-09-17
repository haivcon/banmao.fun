import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const owners: Record<string, string> = {
  SakuraGarden: 'BackgroundExpansion', CosmicSuit: 'BodyEffects',
  NatureSuit: 'BodyEffects', TitanSuit: 'BodyEffects', BodyTips: 'BodyLib',
  NewAccessories: 'AccessoryExpansion', BubbleLaunch: 'ArtUpgrade', BubbleFlight: 'ArtUpgrade',
};
const source = (name: string) => readFileSync(join(root, `contracts/BanmaoKing/Lib/BanmaoKing${name}.sol`), 'utf8');

test.each(Object.entries(owners))('%s has exactly one canonical section in %s, without a legacy file', (name, owner) => {
  expect(existsSync(join(root, `contracts/BanmaoKing/Lib/BanmaoKing${name}.sol`))).toBe(false);
  const text = source(owner);
  expect(text.split(`// BEGIN CANONICAL ${name}\n`)).toHaveLength(2);
  expect(text.split(`// END CANONICAL ${name}\n`)).toHaveLength(2);
  expect(text).toContain(`library BanmaoKing${name} {`);
  expect(text).not.toContain(`from "./BanmaoKing${owner}.sol"`);
});

test('new accessories execute in their expansion owner, not the base catalogue', () => {
  expect(source('AccessoryLib')).not.toContain('BanmaoKingNewAccessories');
  expect(source('AccessoryLib')).toContain('if (id >= 21) return expansion.render(id);');
  expect(source('AccessoryExpansion')).toContain('if(id>=21)return extraPart.render(id);');
});

test('baking updates only the launch section in ArtUpgrade', () => {
  const script = readFileSync(join(root, 'tools/bake-king-bubble-launch.cjs'), 'utf8');
  expect(script).toContain("section('contracts/BanmaoKing/Lib/BanmaoKingArtUpgrade.sol','BubbleLaunch')");
  expect(script).toContain('.replace(previous,baked)');
});
