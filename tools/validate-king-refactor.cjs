'use strict';
// Compare against a copy of contracts/BanmaoKing taken BEFORE editing.
// Usage: node tools/validate-king-refactor.cjs <baseline BanmaoKing directory>
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const solc = require('solc');
const ganache = require('ganache');
const { ethers } = require('ethers');
const root = path.resolve(__dirname, '..');
const prefix = 'contracts/BanmaoKing/';
const baseline = process.argv[2];
assert(baseline, 'Supply the pre-refactor BanmaoKing directory');

function compile(directory) {
  const sources = {};
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith('.sol')) sources[prefix + path.relative(directory, file).replaceAll('\\', '/')] = { content: fs.readFileSync(file, 'utf8') };
    }
  }
  walk(directory);
  const output = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources, settings: {
    optimizer: { enabled: true, runs: 200 }, evmVersion: 'shanghai',
    metadata: { bytecodeHash: 'none' },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.bytecode.linkReferences', 'evm.deployedBytecode.object'] } }
  }}), { import: file => ({ contents: fs.readFileSync(path.join(root, 'node_modules', file), 'utf8') }) }));
  assert.equal((output.errors || []).filter(e => e.severity === 'error').length, 0, JSON.stringify(output.errors));
  return Object.assign({}, ...Object.entries(output.contracts).filter(([file]) => file.startsWith(prefix)).map(([, contracts]) => contracts));
}

async function main() {
  const before = compile(path.resolve(baseline));
  const after = compile(path.join(root, prefix));
  const changed = new Set(['BanmaoKingBackgroundExpansion','BanmaoKingBackgroundEffects','BanmaoKingAccessoryLib','BanmaoKingRenderer']);
  const added = Object.keys(after).filter(name => !before[name]);
  assert.deepEqual(added.sort(), ['BackgroundEffects','BackgroundExpansion'].flatMap(name=>[0,1,2].map(i=>'BanmaoKing'+name+'Part'+i)).sort());
  for (const name of Object.keys(before)) assert(after[name], 'Missing baseline contract '+name);
  let unchanged = 0, saved = 0;
  for (const [name, artifact] of Object.entries(after)) {
    if (!before[name]) continue;
    const stableABI = (abi, current) => abi.filter(x => {
      if (x.type === 'constructor') return false;
      return !(current && /^BanmaoKingBackground(Effects|Expansion)$/.test(name) && x.type === 'function' && /^part[012]$/.test(x.name || ''));
    }).map(entry => {
      // Expansion already used view for Royal; only Effects changes mutability.
      if (name === 'BanmaoKingBackgroundEffects' && entry.type === 'function' && entry.name === 'render') {
        assert.equal(entry.stateMutability, current ? 'view' : 'pure', name + ' render mutability');
        return { ...entry, stateMutability: 'view' };
      }
      return entry;
    });
    assert.deepEqual(changed.has(name)?stableABI(artifact.abi, true):artifact.abi, changed.has(name)?stableABI(before[name].abi, false):before[name].abi, name + ' callable ABI');
    assert.deepEqual(artifact.evm.bytecode.linkReferences, before[name].evm.bytecode.linkReferences, name + ' links');
    if (!/^BanmaoKingSecondaryMotion\d+$/.test(name) && name !== 'BanmaoKingAccessoryExpansion' && !changed.has(name)) {
      // AccessoryLib embeds the optimized expansion's creation code, but its
      // runtime and constructor ABI remain unchanged.
      if (name !== 'BanmaoKingAccessoryLib') assert.equal(artifact.evm.bytecode.object, before[name].evm.bytecode.object, name + ' creation code');
      assert.equal(artifact.evm.deployedBytecode.object, before[name].evm.deployedBytecode.object, name + ' runtime');
      unchanged++;
    } else if (/^BanmaoKingSecondaryMotion\d+$/.test(name)) {
      saved += (before[name].evm.deployedBytecode.object.length - artifact.evm.deployedBytecode.object.length) / 2;
    }
  }
  console.log('PASS: callable ABI/link references preserved except declared router getters, constructors and Effects pure -> view;', unchanged, 'unchanged runtimes');
  // This provider is ONLY for differential comparison: the preserved baseline
  // contains oversized backgrounds. Production limits remain enforced by the
  // separate art-effects/deployment validator, never by this parity harness.
  const rpc = ganache.provider({ logging: { quiet: true }, chain: { allowUnlimitedContractSize: true, allowUnlimitedInitCodeSize: true }, miner: { blockGasLimit: 100000000 } });
  try {
    const provider = new ethers.providers.Web3Provider(rpc);
    provider.pollingInterval = 10;
    async function deploy(a,args=[]) { return (await new ethers.ContractFactory(a.abi, a.evm.bytecode.object, provider.getSigner()).deploy(...args)).deployed(); }
    const graph=await require('./deploy-king-graph.cjs').deployKingGraph((name,args)=>deploy(after[name],args));
    const oldAccessory = await deploy(before.BanmaoKingAccessoryExpansion);
    const newAccessory = await deploy(after.BanmaoKingAccessoryExpansion);
    async function outcome(contract, method, id) {
      try { return { value: await contract.callStatic[method](id) }; }
      catch (error) {
        const data = error.error?.data || error.data;
        assert.equal(typeof data, 'string', `${method}(${id}) missing revert data`);
        return { revert: data };
      }
    }
    for (let id = 0; id < 256; id++) {
      for (const method of ['render', 'renderRear', 'traitName']) {
        assert.deepEqual(await outcome(newAccessory, method, id), await outcome(oldAccessory, method, id), `accessory ${method}(${id})`);
      }
    }
    console.log('PASS: accessory expansion exact SVG/names/reverts for all 256 IDs and 3 methods');
    const oldBackground = await deploy(before.BanmaoKingBackgroundExpansion);
    const newBackground = graph.nodes.BanmaoKingBackgroundExpansion;
    for (let id = 0; id < 256; id++) {
      for (const method of ['render', 'traitName']) {
        assert.deepEqual(await outcome(newBackground, method, id), await outcome(oldBackground, method, id), `background ${method}(${id})`);
      }
    }
    console.log('PASS: background expansion exact SVG/names/reverts for all 256 IDs and 2 methods');
    for (const [name,methods] of [['BanmaoKingBackgroundEffects',['render']],['BanmaoKingAccessoryLib',['render','renderRear','traitName']]]) {
      const old=await deploy(before[name]), current=graph.nodes[name];
      for(let id=0;id<256;id++)for(const method of methods)assert.deepEqual(await outcome(current,method,id),await outcome(old,method,id),`${name}.${method}(${id})`);
      console.log('PASS:',name,'all 256 IDs, exact returns/reverts');
    }
    for (let id = 0; id < 21; id++) {
      const name = 'BanmaoKingSecondaryMotion' + id;
      const oldPart = await deploy(before[name]), newPart = await deploy(after[name]);
      assert.equal(await newPart.render(id), await oldPart.render(id), name + ' exact SVG');
      // Every other uint8 input must preserve InvalidTrait(), not only id >= 21.
      for (let invalid = 0; invalid < 256; invalid++) {
        if (invalid === id) continue;
        try { await newPart.callStatic.render(invalid); assert.fail(name + ' accepted ' + invalid); }
        catch (error) {
          const data = error.error?.data || error.data;
          assert.equal(data, ethers.utils.id('InvalidTrait()').slice(0, 10), name + ' invalid ' + invalid);
        }
      }
      console.log('PASS:', name, 'SVG byte-identical; all 255 invalid IDs rejected');
    }
  } finally { await rpc.disconnect(); }
  console.log('PASS: total secondary runtime bytes saved:', saved);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
