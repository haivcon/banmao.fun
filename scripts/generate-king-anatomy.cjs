// Mirror the authored anatomy into the immutable SVG catalogue.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { actionPoseSvg, frontPawsSvg } = require(path.join(root, 'app/collection/banmaoking/anatomy.ts'));
const file = path.join(root, 'contracts/BanmaoKing/Lib/BanmaoKingBodyLib.sol');
let source = fs.readFileSync(file, 'utf8');
// Intern repeated SVG tags across poses to keep deployed bytecode below EIP-170.
source = source.replace(/\n    function _anatomyPart\d+\(\) private pure returns \(string memory\) \{ return '[^']*'; \}/g, '');
const tags = new Map();
for (const render of [actionPoseSvg, frontPawsSvg]) for (let pose = 0; pose < 6; pose++) {
  for (const tag of render(pose).match(/<[^>]+>/g) || []) tags.set(tag, (tags.get(tag) || 0) + 1);
}
const shared = [...tags].filter(([tag, count]) => tag.length > 60 && count > 1).map(([tag]) => tag);
function expression(svg) {
  const parts = [];
  let literal = '';
  for (const tag of svg.match(/<[^>]+>/g) || []) {
    const index = shared.indexOf(tag);
    if (index < 0) literal += tag;
    else {
      if (literal) parts.push(`'${literal}'`);
      literal = '';
      parts.push(`_anatomyPart${index}()`);
    }
  }
  if (literal) parts.push(`'${literal}'`);
  if (!parts.length) return "''";
  while (parts.length > 6) parts.splice(0, 6, `string.concat(${parts.slice(0, 6).join(', ')})`);
  return parts.length === 1 ? parts[0] : `string.concat(${parts.join(', ')})`;
}
for (const [name, render] of [['_actionPose', actionPoseSvg], ['_frontPaws', frontPawsSvg]]) {
  const pattern = new RegExp(`    function ${name}\\(uint256 tokenId\\)[\\s\\S]*?\\n    }`);
  if (!pattern.test(source)) throw new Error(`Missing ${name}`);
  const branches = Array.from({ length: 6 }, (_, pose) => `        ${pose < 5 ? `if (pose == ${pose}) ` : ''}return ${expression(render(pose))};`).join('\n');
  source = source.replace(pattern, `    function ${name}(uint256 tokenId) private pure returns (string memory) {\n        uint256 pose = tokenId % 6;\n${branches}\n    }`);
}
source = source.trimEnd().slice(0, -1).trimEnd() + '\n' + shared.map((tag, i) => `\n    function _anatomyPart${i}() private pure returns (string memory) { return '${tag}'; }`).join('') + '\n}\n';
fs.writeFileSync(file, source);
console.log('Mirrored all six anatomy poses and front paws.');
