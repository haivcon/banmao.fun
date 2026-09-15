> Current royal-source revision: Solidity and new mint source now include 17 bodies × 21 expressions × 21 accessories × 17 backgrounds (127,449). Royal artwork and corner identity sync from contracts to frontend. Older preview-only/count statements below describe the preceding revision. No public deployment is confirmed. See [royal contract migration](banmaoking-royal-contract.md).

# BanmaoKing theme expansion

Name and symbol remain Banmao King / banmaoKING. This source revision does not update immutable deployed contracts or change the frontend mint address.

## Preview

Open `/collection/banmaoking#king-studio`. Theme Lab offers Cosmic, Bitcoin, Ethereum, OKB, Developer, Office, Nature and Royal presets. Each can be mixed with the existing traits. Extended names use English fallback in all locales. Live collection metrics and mint configuration still describe the existing deployment.

Current Solidity source catalogue: **16 bodies × 21 expressions × 20 accessories × 16 backgrounds = 107,520** four-layer combinations. Theme Lab adds preview-only King's Gold body, Imperial Regalia accessory and Throne Room background: **17 × 21 × 21 × 17 = 127,449**. Royal Decree (expression ID 20) is shared by preview and current Solidity source. These counts are neither totalSupply nor configured maxSupply. Themes are presets, not a fifth stored trait. IDs 7–20 have distinct eye-motion profiles; closed and symbolic eyes retain specialized treatment. No rarity score or game statistics are claimed.

## Shared artwork and checks

- `scripts/king-expansion.cjs`: legacy base expansion generator; do not use its face output alone. Run `scripts/generate-king-expressions.cjs` last to restore the current 21 faces, shared whiskers, eye SMIL and tail timelines from TypeScript source. Scripts remain Git-ignored; reviewed distributable generation tooling is still a release requirement.
- `scripts/generate-king-parts.cjs`: preserves expanded expression dispatch when regenerating original parts.
- `scripts/king-expansion-check.cjs`: compiles Solidity, checks EIP-170 / EIP-3860 sizes, renders all trait selections and saves eight SVG previews under `test-results/king-expansion`.
- `scripts/king-expansion-evm.cjs`: after compilation, deploys locally, compares shared fragments and renders complete metadata.

Run from the repository root with Node. No mainnet transaction is sent by these checks.

## Deployment change

`BanmaoKingRenderer` requires **six immutable dependencies**, in order: body, expression, accessory, background expansion, motion part 0, motion part 1. Deploy the background expansion and both motion parts separately first. Expression and accessory facades create their expansion contracts. NFT name, four-byte trait packing and interface selectors stay unchanged; several layer interface functions are view. Current NFT source decodes using radices **16,21,20,16**. Do not use this decoder to reinterpret historical minted assignments.

Existing deployment manifests are historical and must not be overwritten. Historical scripts/tests assuming the three-argument renderer constructor need migration before use for a new release. Verify all new runtime bytecode and constructors, conduct full mint/security testing and visual review before deploying. Never repoint the live mint UI before a verified release.

Preview does not guarantee whole-SVG byte parity with on-chain rendering: the original frontend animation pipeline differs from Solidity. Expansion fragments are generated from the same source and compared exactly in the EVM test. Review accessory occlusion across poses and marketplace animation support before release.
