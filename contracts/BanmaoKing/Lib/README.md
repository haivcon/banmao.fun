# BanmaoKing Solidity layout

## Frontend SMIL synchronization (working tree)

The frontend is now the canonical artwork reference for the synchronization changes. Accessory overlays remain pure SMIL, Halo rear/front targets are corrected, expanded backgrounds include particles, and secondary motion/medallion profiles follow the frontend. The compositor applies the body expression clock while preserving independently timed Developer, Office, Cosmic, Nature and OKB artwork. This does not change NFT supply, minting or trait allocation.

The synchronization adds linked immutable artwork fragments and a body clock library. Deployment tooling must discover **compiler linkReferences**, not reuse the prior deployment list. With Solidity 0.8.30, optimizer 200, Shanghai and viaIR disabled, the current synchronization compilation contains 127 project declarations and the largest runtime is **18,287 bytes**. The historical artifact hashes, counts and parity results below describe the earlier refactor baseline, not validation of these new changes. A local Mini token #0 render reverted without reason under a 30-million-gas call cap; its cause remains unresolved and is a release blocker. Full composite/browser parity and target-network gas certification remain release gates; do not interpret the earlier results as approval to deploy this working tree.

## Grouped sources and linked artwork

There are ten Solidity source files: seven grouped files below, the NFT, the Renderer and the renderer interface. Each feature directory contains `BanmaoKing<Feature>Sources.sol`; one source contains multiple independently deployable declarations. Names use `Part<N>`, `Artwork<N>`, `Interface<N>` or group-level `Lib`. Artifact identifiers and deterministic deployment addresses change; deployed contracts are not upgraded by a source move.

The artwork runtime goal is 14–18 KiB (14,336–18,432 bytes), measured per deployed contract, never per source file. Helpers and remainder parts may be smaller; do not pad bytecode. With Solidity **0.8.30**, optimizer **200**, **Shanghai**, **viaIR false**, the current source-hash-verified `target` compilation has no runtime over 18,432 bytes; the maximum is 18,430. Some existing parts and remainders remain below 14 KiB, including BackgroundPart7 at 14,331 bytes. This is not a claim that every declaration is inside the target band.

BackgroundPart8 injects `address[4]` plus its separately deployed ID16 renderer. The four scene parts are Part5 → IDs 8/11, Part6 → 9/12, Part7 → 10/13, and Part13 → 14/15. Public IDs remain Body 0–14, Expression 0–20, Accessory 1–25, Background 0–16.

### Linking and deployment

Compile the full recursive tree with `evm.bytecode.linkReferences` in output selection. Deploy referenced public artwork libraries first and patch only compiler-reported link offsets with their 20-byte addresses. Then deploy the dependency graph and inject constructor addresses. Local `deployLinkedKingGraph` in the ignored deployment tooling implements this ordering; its deployment callback receives the linked bytecode. A plain `ContractFactory` constructed from unlinked output will fail. Validate both runtime and **full ABI-encoded constructor initcode** (including arguments). No source-writing generator may overwrite an entire grouped file to update one declaration.

### Verification and release gate

All 101 original project declarations are uniquely retained in the 114-declaration current tree. Ten current source hashes match the `target` artifact (`c2c1ed94b71dcd660851c83a5ee62b3f7a875ced649249c8fb899b5893da010b`). Current-artifact EVM parity passed 329 comparisons, including all 78 trait/name pairs, rear/effects, 45 composite SVG/metadata cases and NFT mint/tokenURI, with 85 local deployments under standard code/initcode limits. The focused layout/linking/ID/codegen run passed 88 tests. Chromium playback passed 21 actions in normal and reduced-motion modes. Two representative render calls passed at 30 million gas locally; this is not target-network RPC certification. These are local results, not production deployment approval: broad test migration and full network-specific validation remain open. Legacy broad/security suites still contain obsolete catalogue/artwork expectations. The BubbleLaunch baker check finds 18/21 generated rows different from the preserved dataset; **do not rebake** merely to silence that check. No public deployment is implied by these sources.

## Source ownership

| Grouped source | Responsibility |
| --- | --- |
| `Body/BanmaoKingBodySources.sol` | Body router, anatomy, effects, cyborg and body-tip artwork |
| `Expression/BanmaoKingExpressionSources.sol` | Expression router, expansion, expression artwork and eye overlays |
| `Accessory/BanmaoKingAccessorySources.sol` | Accessory router, front/rear/composed parts, props and linked fragments |
| `Background/BanmaoKingBackgroundSources.sol` | Base scenes, four expansion parts, effects, atmosphere and router |
| `Motion/BanmaoKingMotionSources.sol` | Motion, secondary motion, choreography, direction and bubble data |
| `Identity/BanmaoKingIdentitySources.sol` | Identity composition, badges, medallion and diamond rays |
| `Shared/BanmaoKingSharedSources.sol` | Cross-layer royal constants and linked immutable SVG fragments |

There are no Solidity files directly under `Lib/`. Body, accessory, and background effects/expansions live alongside their layer routers.

## Naming and compatibility

Use the grouped source path and generic declaration name together for fully qualified artifact identifiers. `Part` denotes an implementation or router; `Artwork` denotes an internal or linked library. Part numbers are internal identifiers, **not trait IDs**. Preserve artwork-specific SVG strings, labels, animation names and allocation seeds even though declarations are generic. Source moves change compiler metadata; creation code and deterministic deployment addresses must not be assumed unchanged.

Legacy one-off migration scripts are not supported regeneration entry points. Do not rerun them against this layout. Update and validate generators in check mode before any source-writing use.

A `*Lib` contract is usually a public layer entry point; `*Part*` contracts implement bounded portions of that layer. Do not combine parts into a monolithic contract without checking EIP-170 runtime and EIP-3860 full constructor initcode limits.

Former `BEGIN/END CANONICAL` wrapper comments are no longer source boundaries. Local generators must select a unique generic declaration using a string/comment-aware parser. Directory organization alone is not permission to rebake artwork or BubbleLaunch data. Resolve the grouped paths and preserve every unrelated declaration when writing.

Deployment addresses and constructor arguments must be resolved by contract name and ABI, not by the former flat source paths. Compile imports recursively from `contracts/BanmaoKing`; a flat glob of this directory misses grouped contracts.
