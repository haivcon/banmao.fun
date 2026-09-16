# BanmaoKing behavior-preserving cleanup

## Badge gas optimization and compiler warning fix (2026-09-16)

- Badge assembly now uses O(n log n) balanced merge tree instead of O(n²) sequential append.
  tokenURI returns at 50M gas (previously reverted); SVG content is byte-identical.
- MotionLib Part1 unused variable warning resolved: removed dead `durations` array,
  replaced with `require(expression < 21)` range validation.
- SMIL tests aligned with choreography/volume split and watery tears expression.
- Security tests aligned with 17/21/21/17 catalogue, expression action names from
  choreography.json, snapshot restore between tests, and proper ganache disconnect.
- All 201 core tests passed (Codegen 30, DeployGraph 2, SecondaryMotion 51,
  SoftWrists 68, SMIL 50).
- Badge exact parity verified at 42, 999, 9216, 10000 and uint256 max.
- TypeScript exit 0.
- All compiled contracts below EIP-170/EIP-3860 limits.

## Validation follow-up (2026-09-16)

Current release gate is NOT green. Fresh observed results:
- Codegen: 30/30 passed; shared deployment graph regression tests: 2/2 passed.
- Generated-source `--check` passed without regenerating artwork.
- Typecheck passed with recorded exit code 0 (`king-ts-verified.status.json`); a subsequent rerun includes the new graph tests.
- Chromium playback passed all 21 actions in normal and reduced-motion modes (`king-playback-verified.status.json`).
- Previous security run completed with 10 passed / 8 failed, including stale constructor/count assumptions, tokenURI call failures and catalogue timeout. Constructor/count fixes are applied; the rerun is not yet certified.
- ABI comparison permits only Effects.render pure -> view; Expansion.render was already view in the preserved baseline. The first follow-up run exposed that distinction; the corrected run is `king-parity-final`.
- Security samples 9,216 unique mints and checks configured-supply exhaustion; this is NOT exhaustive coverage of all 127,449 trait combinations.

`tools/run-king-validation.cjs` records stdout, stderr, timestamps and exit codes under `test-results/<name>.*`. A running status is not a pass. Current long-running checks use `king-security-verified`, `king-parity-final`, `king-art-final` and `king-ts-final`.

Repository audit: all 24 BanmaoKing Solidity files are reachable through imports from the main entry points. Keep the current NFT/Renderer/Lib organization and generated multi-contract files. No Solidity deletion is justified. Preserve the original temporary baseline unchanged.

Local legacy tooling remains a release blocker: `scripts/king-smil-validation.cjs` and `scripts/king-smil-overhaul-validation.cjs` now use the shared graph but import a missing `scripts/banmaoking-release.cjs`. `scripts/king-expansion-evm.cjs` and `scripts/king-parts-validation.cjs` still target historical artifacts/constructors. Do not label those scripts validated. The scripts directory is deliberately Git-ignored; do not silently unignore deployment journals or secrets to solve packaging. Restore/audit the release builder and package only reviewed tooling before a clean-checkout release.

No public-chain deployment, artifact cleanup, or artwork change was performed in this follow-up.

## Sharded deployment update (2026-09-16; historical measurements below)

The approved deployment refactor now changes constructors, not authored artwork:
- BackgroundEffects: three generated parts and an immutable router.
- BackgroundExpansion: three generated scene parts, immutable router and injected Royal background.
- AccessoryLib: injected Royal/Expansion addresses.
- Renderer: ten constructor addresses; effects and diamond rays no longer created inline.
- `tools/deploy-king-graph.cjs` centralizes ordering; the resume deployer and security fixture use it. Legacy release archives must be rebuilt.

Verified from fresh logs: all compiled contracts are below EIP-170/EIP-3860 limits; the complete renderer graph deployed on size-limited Ganache; frontend/EVM art-effects validation passed; codegen Jest passed 30/30. See `test-results/king-sharded-size.log`, `king-graph.log`, and `king-codegen.err`.

| Contract | Runtime bytes | Initcode including static arguments |
| --- | ---: | ---: |
| AccessoryLib | 21,737 | 22,126 |
| Renderer | 21,154 | 22,882 |
| BackgroundEffects router | 1,190 | 1,857 |
| Effects parts 0 / 1 / 2 | 23,197 / 12,618 / 3,905 | 23,225 / 12,646 / 3,933 |
| BackgroundExpansion router | 1,707 | 2,534 |
| Scene parts 0 / 1 / 2 | 15,461 / 17,068 / 15,940 | 15,489 / 17,096 / 15,968 |

EffectsPart0 has only 1,379 bytes runtime headroom. Remeasure after catalogue changes.
Full differential, security, typecheck and playback completion must be confirmed from current logs before release. Older one-off validation scripts still contain obsolete constructor calls and need migration; this is not a declaration that every release entry point is ready. No public-chain deployment has been performed. Never overwrite the preserved baseline in `%TEMP%/banmaoking-refactor-baseline/BanmaoKing`.

## Historical boundaries (before approved deployment changes)

Keep the existing Solidity paths, contract names, ABI, constructor graph and trait
IDs. Do not merge deployed contracts merely to reduce source duplication. Generated
SVG strings are artwork: their whitespace, tag order, IDs, hrefs, timing, colours
and layering must remain byte-identical.

## Ownership map

All paths below are relative to `contracts/BanmaoKing/`:

| Responsibility | Source owners |
| --- | --- |
| Public interfaces | `IBanmaoKingRenderer.sol` |
| NFT state and metadata entry points | `NFT/BanmaoKingNFT.sol` |
| Layer composition and base backgrounds | `Renderer/BanmaoKingRenderer.sol` |
| Body routing, geometry and effects | `Lib/BanmaoKingBodyLib.sol`, `Lib/BanmaoKingAnatomyPart.sol`, `Lib/BanmaoKingBodyEffects.sol` |
| Expression routing and parts | `Lib/BanmaoKingExpressionLib.sol`, `Lib/BanmaoKingExpressionParts.sol`, `Lib/BanmaoKingExpressionExpansion.sol` |
| Accessory routing and expansion | `Lib/BanmaoKingAccessoryLib.sol`, `Lib/BanmaoKingAccessoryExpansion.sol` |
| Background expansion and effects | `Lib/BanmaoKingBackgroundExpansion.sol`, `Lib/BanmaoKingBackgroundEffects.sol` |
| Motion and rig timing | `Lib/BanmaoKingMotionLib.sol`, `Lib/BanmaoKingSecondaryMotion.sol`, `Lib/BanmaoKingChoreography.sol`, `Lib/BanmaoKingDirection.sol` |
| Royal artwork | `Lib/BanmaoKingRoyalLib.sol`, `Lib/BanmaoKingRoyalAccessory.sol`, `Lib/BanmaoKingRoyalBackground.sol` |
| Additional overlays | `Lib/BanmaoKingArtUpgrade.sol`, `Lib/BanmaoKingDiamondRays.sol` |
| Identity and badges | `Lib/BanmaoKingIdentityLib.sol`, `Lib/BanmaoKingBadgeLib.sol` |

## Generator separation

`tools/sync-king-art-effects.cjs` owns catalogue inputs and output destinations.
`tools/king-svg-codegen.cjs` owns exact-tag interning and bounded concatenation.
Generated contracts separate validation, dispatch and local SVG helpers.
Helper numbering is local to each contract, not a global artwork identifier.

Each secondary-motion part serves exactly one expression. It now constructs only
that expression's duration instead of a 21-element memory array. All other uint8
inputs still revert with `InvalidTrait()`. No authored motion data is modified.

The existing body highlight fallback is intentional and unchanged: `_peelHighlight`
returns `#fff9a8` by default, body 15 has an explicit branch, and Royal uses its own
peel gradient. The earlier suggestion of an empty highlight was incorrect.

## Validation

Before editing, copy the current `contracts/BanmaoKing` directory (including local
uncommitted artwork changes) outside the repository. Then run:

```text
node tools/sync-king-art-effects.cjs --check
node tools/validate-king-refactor.cjs <absolute-path-to-baseline-BanmaoKing-directory>
node tools/validate-king-art-effects.cjs
node node_modules/jest/bin/jest.js --runInBand --testPathPatterns=banmaoKing
```

The differential validator uses solc, optimizer runs 200, Shanghai, and disables
metadata hashes solely for executable bytecode comparison. It checks the complete
contract-name set, ABI and link references; requires identical creation/runtime
code outside the changed secondary parts; and compares all 21 changed SVG outputs
on a local EVM against the pre-edit contracts. It checks every invalid uint8 input
on the new parts. This is not a public-chain deployment.

The existing art-effects validator additionally checks exact frontend/EVM parity
and standard-metadata deployment sizes. No gas-cost estimate or deployed address
is inferred from source size. Full browser playback and exhaustive tokenURI testing
are separate from these checks.

## Background interning follow-up (2026-09-16)

- BackgroundExpansion now uses the shared exact-tag generator from the current
  `expansion.json`; Royal routing, names and constructor are unchanged.
- Fresh size report (`test-results/king-size-background-interning.log`) compiled
  successfully: runtime 46,553 and initcode 67,597 bytes, down 1,202 bytes each.
  Both remain over the deployment limits. The other three blockers below remain.
- Generator suite rerun: 30/30 passed, including reconstruction of all eight
  background SVG byte sequences and preservation of Royal routing. Source sync
  check and JavaScript syntax checks passed.
- Differential harness now checks background render/traitName for all 256 IDs.
  Its local provider permits oversized baseline contracts ONLY for comparison;
  the separate deployment validator still enforces real limits. The fresh run
  is pending until `test-results/king-background-parity.log` records completion;
  do not treat the earlier differential result as verifying this new change.
- Security test setup still passes only three renderer addresses although the
  current constructor takes eight. This is identified, not yet fixed.
- No artwork, deployment graph, renderer constructor or directory layout was
  changed in this follow-up. A sharded background deployment remains necessary.

## Follow-up verification (2026-09-16)

This follow-up supersedes the historical results below. Release remains blocked;
folder migration and deployment architecture changes have NOT been completed.

- Focused generator/secondary-motion Jest run: 80/80 passed. The action-8 test now
  verifies a staff scene, negative full-turn closure, and all 21 accessory targets.
  Staff targets belong to accessories 14, 19 and 20; absent optional targets are inert.
- Soft-wrist suite: 68/68 passed after explicitly typing the SVG path list as
  `string[]` (TypeScript had inferred an unusable union with `never[]`).
- Added rejection of concat arity below two, non-integral or non-finite arity,
  preventing a generator infinite loop; six regression cases cover it.
- Generated-source check and Chromium playback passed (21 actions, normal and
  reduced-motion). No authored SVG or choreography was changed in this follow-up.
- Differential validation completed: all 21 secondary outputs byte-identical,
  all 5,355 invalid secondary IDs rejected, aggregate runtime saving 12,653 bytes.
  All ABIs/link references and 34 other runtimes match the baseline; the parent
  accessory creation code necessarily embeds the newly optimized expansion.
- Full-project TypeScript rerun completed with no diagnostics after the wrist
  test typing fix. `git diff --check` exited zero.
- Accessory expansion uses exact-tag interning from `expansion.json`; all 256 IDs
  across render/renderRear/traitName match the untouched pre-refactor baseline,
  including return bytes and revert data. Constructor/API/deployment graph unchanged.
- solc 0.8.30, optimizer 200, Shanghai: accessory expansion runtime fell from
  19,601 to 18,375 bytes; parent initcode fell from 52,788 to 51,562 bytes.
  This is an improvement, NOT a deployability fix.
- Full measurement also found background-effects runtime 38,962 bytes,
  background-expansion runtime 47,755 / initcode 68,799 bytes, and renderer
  initcode 73,299 bytes including its eight address arguments. Runtime limit is
  24,576 and Shanghai initcode limit is 49,152. The validator now reports all
  violations rather than stopping at the first contract.
- Broader Jest run timed out; logs include failures in Lab, ArtEffects,
  Expressions21 and Palms. Their expectations have not been rewritten to conceal
  mismatches. Exhaustive tokenURI coverage is still incomplete.
- Added narrow gitignore exceptions for the new codegen, differential validator,
  and focused tests so essential files are not silently omitted from delivery.

Local evidence is under `test-results/king-*-current.*`,
`test-results/king-size.log`, and `test-results/king-typecheck-final.*`.
Old authoring tools such as `refine-king-accessories.cjs` can emit the old literal
layout; always run `sync-king-art-effects.cjs` after those tools, then `--check`.
Do not deploy until the remaining catalogue contracts are split or their
construction dependencies externalized and the entire deployment is retested.

## Historical results from the initial cleanup

- Generated-source check: passed.
- New generator regression suite: 23 tests passed.
- Differential compilation: 35 unchanged contracts/interfaces have identical ABI,
  link references and creation/runtime code with metadata hashes disabled.
- All 21 changed secondary-motion parts: byte-identical SVG on the local EVM.
- All 5,355 invalid uint8 inputs across those parts: `InvalidTrait()` preserved.
- Aggregate secondary runtime reduction: 12,653 bytes in the differential build.
- Chrome playback: passed all 21 actions in normal and reduced-motion modes.
- Full release validation is NOT green: the existing art-effects validator stops
  at `BanmaoKingAccessoryLib` runtime 21,737 bytes / initcode 52,788 bytes, over the
  49,152-byte initcode limit. That contract's executable code is unchanged by this
  cleanup. Broad Jest suites also report existing artwork expectation mismatches;
  no artwork or expectations were changed to hide these failures.

## Deliberately deferred

Physical folder moves, changing externally visible names, consolidating runtime
contracts, parameterizing visually similar but unequal animation tags, and moving
backgrounds out of the renderer are not part of this safe pass. These require
separate dependency/size validation; visual similarity alone is not equivalence.
