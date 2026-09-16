# Metadata gas and regression fixes — 2026-09-16

## Implemented

- Badge assembly now merges adjacent chunks in a balanced tree rather than repeatedly copying a growing prefix. No SVG content, metadata schema, mint event order, or dependency constructor is intentionally changed.
- SMIL regressions now exercise the authored watery tears and choreography/volume split, including closed scale loops and bounded area-preserving scaling.
- Security expectations use expression action names and the 17/21/21/17 catalogue. Individual catalogue cases replace one long timeout-prone loop. A snapshot restores the deployed graph between tests.
- Badge regression compares complete animated markup against the frontend at digit boundaries, including uint256 fallback.
- `tools/diagnose-king-metadata.cjs` deploys the full graph, mints, decodes metadata and compares its image with NFT renderSVG under explicit call budgets. Failed budgets produce a nonzero exit code.

## Verified locally

- Eight animation/codegen/deployment-graph suites: 226 passed.
- TypeScript: exit 0 (`king-types-final.status.json`).
- Generated art-effects source check: passed.
- Exact animated badge parity at 42, 999, 9216, 10000 and uint256 max: passed (`king-badge-exact.status.json`, exit 0; 1 selected test, 75 skipped).
- For deterministic token traits [16,8,11,14], the previous badge implementation reverted at 50M gas and returned at 100M gas. The updated implementation returns at 50M gas. SVG length: 121,517 bytes; URI length: 216,581 bytes.
- Decoded SVG matches NFT renderSVG at 50M. SVG hash: `0xc68cbd7a5465caa9c01895b157c7ce0592f9b9376429ec1d87d7639bf6726a2c`.
- **30M gas still reverts**. The budget diagnostic therefore correctly exits 1. This is not a release approval or a claim of compatibility with target-chain RPC limits.

## Outstanding validation

Full security and exact-badge run status is persisted under `test-results/king-security-final.*` and `test-results/king-badge-exact.*`. Read their final status, not merely log presence. Earlier `king-security-fix` and `king-metadata-security-fix` runs were stopped because they used superseded fixtures.

The preserved temporary baseline was not modified. Exact badge regression and broader differential validation must establish content parity; equal payload lengths alone do not establish parity. On-chain SVG Chromium playback, live RPC budgets, marketplace behavior and clean-checkout release tooling remain release gates. The existing immutable deployment must be redeployed to benefit from changed renderer code; no live deployment was performed.
