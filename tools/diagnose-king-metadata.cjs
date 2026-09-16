'use strict';
// Diagnostic only: retain normal contract-size limits and compare explicit eth_call budgets.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const solc = require('solc');
const ganache = require('ganache');
const { ethers } = require('ethers');
const root = path.resolve(__dirname, '..');
async function main() {
  const entry = 'contracts/BanmaoKing/NFT/BanmaoKingNFT.sol';
  const rendererEntry = 'contracts/BanmaoKing/Renderer/BanmaoKingRenderer.sol';
  const sources = Object.fromEntries([entry, rendererEntry, ...['Body', 'Expression', 'Accessory'].map(name => `contracts/BanmaoKing/Lib/BanmaoKing${name}Lib.sol`)].map(p => [p, { content: fs.readFileSync(path.join(root, p), 'utf8') }]));
  const output = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources, settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'shanghai', outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } } }), { import: p => {
    for (const base of [root, path.join(root, 'node_modules')]) {
      const file = path.join(base, p);
      if (fs.existsSync(file)) return { contents: fs.readFileSync(file, 'utf8') };
    }
    return { error: p };
  } }));
  const errors = (output.errors || []).filter(e => e.severity === 'error');
  if (errors.length) throw Error(JSON.stringify(errors));
  const artifacts = Object.assign({}, ...Object.values(output.contracts));
  const rpc = ganache.provider({ logging: { quiet: true } });
  try {
    const provider = new ethers.providers.Web3Provider(rpc); provider.pollingInterval = 10;
    const signer = provider.getSigner();
    async function deploy(name, args = []) {
      const a = artifacts[name];
      return (await new ethers.ContractFactory(a.abi, a.evm.bytecode.object, signer).deploy(...args)).deployed();
    }
    const { renderer } = await require('./deploy-king-graph.cjs').deployKingGraph(deploy);
    const address = await signer.getAddress();
    const nft = await deploy('BanmaoKingNFT', [renderer.address, address, 3, 1, [], [], address, 200, ethers.utils.id('metadata-diagnostic')]);
    await (await nft.mint(address, ethers.constants.AddressZero, { value: 1 })).wait();
    console.log('traits', (await nft.traits(1)).map(Number));
    let previous;
    for (const gasLimit of [30_000_000, 50_000_000]) {
      try {
        const uri = await nft.tokenURI(1, { gasLimit });
        const metadata = JSON.parse(Buffer.from(uri.split(',')[1], 'base64').toString());
        const svg = Buffer.from(metadata.image.split(',')[1], 'base64').toString();
        assert.equal(metadata.name, 'Banmao King #1');
        assert(svg.includes('repeatCount="indefinite"'));
        assert.equal(svg, await nft.renderSVG(1, { gasLimit }));
        if (previous) assert.equal(uri, previous);
        previous = uri;
        console.log(JSON.stringify({ gasLimit, uriBytes: uri.length, svgBytes: svg.length, svgHash: ethers.utils.id(svg), attributes: metadata.attributes }));
      } catch (error) {
        console.error('FAIL', gasLimit, error.error?.message || error.message);
        process.exitCode = 1;
      }
    }
  } finally { await rpc.disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
