'use strict';
// Target only Wizard Hat branches; do not regenerate unrelated catalogues.
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, f);
const { ACCESSORY_SVGS, accessoryRearSvg } = require(path.join(root, 'app/collection/banmaoking/scene.ts'));
const { smilTargets } = require(path.join(root, 'app/collection/banmaoking/smil.ts'));
function targets(svg) {
  return svg.replace(/<(g|path|ellipse|circle|rect)\b[^<>]*class="([^"]+)"[^<>]*>/g, tag => {
    if (/\bid="/.test(tag)) return tag;
    const classes = tag.match(/class="([^"]+)"/)[1].split(/\s+/);
    const target = smilTargets.find(id => classes.includes(id));
    return target ? tag.replace('class=', `id="smil-${target}" class=`) : tag;
  });
}
const file = path.join(root, 'contracts/BanmaoKing/Lib/BanmaoKingAccessoryLib.sol');
const source = fs.readFileSync(file, 'utf8');
let index = 0;
const scenes = [accessoryRearSvg(9), ACCESSORY_SVGS[9]].map(targets);
const generated = source.replace(/if \(id == 9\) return "<g [^\r\n]*";/g, () => `if (id == 9) return ${JSON.stringify(scenes[index++])};`);
if (index !== 2) throw Error('Expected wizard rear and front branches');
if (process.argv.includes('--check')) {
  if (source !== generated) throw Error('Wizard catalogue out of sync');
} else fs.writeFileSync(file, generated);
console.log('Wizard front/rear catalogue synchronized');
