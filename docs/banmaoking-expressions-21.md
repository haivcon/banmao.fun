# Expression catalogue 0–20

Status reviewed against working source on 2026-09-15; this is not confirmation of a production deployment. See [catalogue and deployment boundaries](banmaoking-theme-expansion.md).

## Shared face fix and eye animation

All 21 expressions now use the same `whiskersSvg()` geometry: three whiskers per side. Expansion faces (IDs 12–20) previously omitted that group entirely. It is now emitted outside the eye/blink and mouth wrappers, so eye visibility and gaze animation do not hide or translate the whiskers. Existing core-face whisker geometry is unchanged.

`eye-motion.ts` defines distinct profiles for IDs 7–20. Royal Decree has wide layered gold eyes and animated highlights. Gaze moves the extracted eye group, not only pupils; closed and symbolic eyes keep specialized behavior. Theme Lab/export use the always-animated path; explicit reduced-motion output remains available to other callers and tests. Automated markup coverage does not establish visual freedom from accessory occlusion.

## Implementation and generation

`app/collection/banmaoking/expression-design.ts` authors refined static geometry and detail motion. `motion.ts` supplies facial SMIL. The local `scripts/generate-king-expressions.cjs` generates Solidity expression parts, expansion fragments, anatomy, and expression tail timelines. Run it after legacy generators; do not regenerate only the old parts catalogue. `scripts/king-expression-motion.cjs` contains 21 tail beat sequences. Existing `/scripts/` ignore policy is intentionally unchanged: these local tools are not included in a normal commit. They must be retained locally or deliberately moved into a reviewed distributable tooling location before release.

The focused generator is intended to be idempotent; two-run hash verification is still required. It does not rewrite unrelated body/accessory facades. Expansion expressions are split into three contracts to reduce runtime size; EIP-170/EIP-3860 compliance must still be checked after regeneration. Royal Decree occupies expression ID 20 in current Solidity source as well as in previews; deployment of this revision is not confirmed. Royal body/accessory/background are now included in Solidity and new mint source; see [royal migration](banmaoking-royal-contract.md).

## New deployment only

The NFT expression radix changes from 20 to 21; total mint combinations become `16 * 21 * 20 * 16 = 107520`. Existing deployments are not changed. Do not relabel old minted trait assignments or replace existing deployment addresses without a separate deployment review.

Renderer constructor now takes six addresses, in order: body, expression, accessory, background expansion, motion part 0, motion part 1. Deploy both motion parts separately first. This avoids embedding their creation code in the renderer and exceeding EIP-3860. All six dependencies remain immutable. Update deployment scripts and legacy contract test fixtures before using them; older fixtures with three/four renderer arguments are incompatible.

## Validation

Current royal revision validation: RoyalContract, Badge, Expressions21 and ReducedMotion passed (4 suites, 85 tests). Royal layer EVM parity, six body poses, invalid IDs and bytecode limits passed. Earlier claims of 129 tests and identical generator hashes were not independently substantiated and are withdrawn. The full 126-render expression EVM matrix, browser playback/occlusion, security/constructor-fixture migration and production build remain release gates.
