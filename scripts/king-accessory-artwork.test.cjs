const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app/collection/banmaoking/accessory-action.ts'), 'utf8');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { AK_SVG, flyingSwordSvg } = context.exports;
const solidity = fs.readFileSync(path.join(root, 'contracts/BanmaoKing/Lib/BanmaoKingAccessoryLib.sol'), 'utf8');

test('AK is slightly larger and magazine ribs end inside the shorter magazine', () => {
  assert.match(AK_SVG, /data-ak-size="2.1"/);
  assert.match(AK_SVG, /M19-7Q26 3 19 14M23-7Q30 4 23 15/);
  assert.doesNotMatch(AK_SVG, /18 21M22-8Q31 8 22 23/);
});

test('sword has a soft blade aura and fading animated light behind the pommel', () => {
  for (const rear of [false, true]) {
    const svg = flyingSwordSvg(rear);
    assert.doesNotMatch(svg, /<ellipse|undefined|NaN/);
    assert.equal((svg.match(/<animateMotion /g) || []).length, 1);
    assert.match(svg, /feGaussianBlur stdDeviation="3"/);
    assert.match(svg, /data-sword-light-trail="true"/);
    assert.match(svg, /M0 36Q-6 66 0 106/);
    assert.match(svg, /offset="1"[^>]*stop-opacity="0"/);
    assert.match(svg, /attributeName="stroke-dashoffset"/);
    for (const [, id] of svg.matchAll(/url\(#([^)]*)\)/g)) {
      assert(svg.includes(`id="${id}"`), `Missing definition ${id}`);
    }
  }
});

test('canonical AK and sword fragments exactly match Solidity and have no BOM', () => {
  assert(solidity.includes(`return ${JSON.stringify(AK_SVG)};`));
  const helper = solidity.slice(solidity.indexOf('function _sword('));
  const literals = [...helper.matchAll(/"(?:\\.|[^"\\])*"/g)].map(m => JSON.parse(m[0]));
  const [rearId, frontId, rearHead, frontHead, ...chunks] = literals;
  for (const rear of [false, true]) {
    const reconstructed = (rear ? rearHead : frontHead) + chunks.join(rear ? rearId : frontId);
    assert.equal(reconstructed, flyingSwordSvg(rear));
    assert(solidity.includes(`return _sword(${rear});`));
  }
  assert.notEqual(solidity.charCodeAt(0), 0xfeff);
  assert.notEqual(source.charCodeAt(0), 0xfeff);
});

test('Party Hat includes a complete birthday set with a readable cake inscription', () => {
  const partyContext = { exports: {} };
  const partySource = fs.readFileSync(path.join(root, 'app/collection/banmaoking/accessory-polish.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(partySource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, partyContext);
  const hat = partyContext.exports.PARTY_HAT_SVG;
  const svg = partyContext.exports.BIRTHDAY_SCENE_SVG;
  for (const part of ['balloons', 'streamers', 'gifts', 'cake', 'candles', 'flames']) {
    assert.equal((svg.match(new RegExp(`data-birthday-${part}="true"`, 'g')) || []).length, 1);
  }
  assert.match(hat, /class="king-party-hat"/);
  assert.doesNotMatch(hat, /data-birthday/);
  assert.doesNotMatch(svg, /king-character-motion|king-action-root|href=/);
  const names = [...svg.matchAll(/data-birthday-motion="([^"]+)"/g)].map(m => m[1]);
  assert.equal(names.length, 18);
  assert.equal(new Set(names).size, 18);
  for (const name of names) assert(svg.includes(`data-birthday-motion="${name}"><animateTransform`));
  const birthdaySol = fs.readFileSync(path.join(root, 'contracts/BanmaoKing/Lib/BanmaoKingBirthdayLib.sol'), 'utf8');
  assert(birthdaySol.includes(`return ${JSON.stringify(svg)};`));
  assert.match(svg, /<text[^>]*y="420"[^>]*>Happy Birthday<\/text>/);
  assert.equal((svg.match(/<g\b/g) || []).length, (svg.match(/<\/g>/g) || []).length);
  assert.doesNotMatch(svg, /undefined|NaN|https?:/);
  const branch = solidity.match(/if \(id == 5\) return ("<g [^\n]*");/);
  assert(branch, 'Party Hat render branch exists');
  assert.equal(JSON.parse(branch[1]).replace(/ id="smil-[^"]+"/g, ''), hat);
});

test('birthday props are outside every body transform across preview expressions', () => {
  const Module = require('node:module');
  const resolve = Module._resolveFilename;
  const previous = require.extensions['.ts'];
  require.extensions['.ts'] = (m, file) => m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, file);
  Module._resolveFilename = function(request, parent, ...rest) {
    if (request.startsWith('.') && parent && !path.extname(request)) {
      const file = path.resolve(path.dirname(parent.filename), request + '.ts');
      if (fs.existsSync(file)) return file;
    }
    return resolve.call(this, request, parent, ...rest);
  };
  try {
    const { previewSvg } = require('../app/collection/banmaoking/smil-preview.ts');
    for (const body of [0, 7]) for (let expression = 0; expression < 21; expression++) {
      const scene = previewSvg({ body, expression, accessory: 5, background: 0 }, 1, 'birthday-test');
      const stack = [];
      let found = 0;
      for (const [tag] of scene.matchAll(/<g\b[^>]*>|<\/g>/g)) {
        if (tag === '</g>') {
          assert(stack.length, 'balanced scene groups');
          stack.pop();
        } else {
          if (tag.includes('data-birthday-scene=')) {
            assert.equal(stack.length, 0, 'birthday scene must be outside all character groups');
            found++;
          }
          stack.push(tag);
        }
      }
      assert.equal(found, 1);
      assert.equal(stack.length, 0);
    }
    const other = previewSvg({ body: 0, expression: 0, accessory: 0, background: 0 }, 1, 'other');
    assert.doesNotMatch(other, /data-birthday-scene/);
  } finally {
    Module._resolveFilename = resolve;
    if (previous) require.extensions['.ts'] = previous;
    else delete require.extensions['.ts'];
  }
});
