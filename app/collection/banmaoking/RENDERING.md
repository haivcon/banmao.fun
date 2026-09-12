# Banmao King rendering parity

## Pixel token identity

`badge.ts` mirrors `BanmaoKingBadgeLib.sol`. A bounded 75-cell badge starts as
five square clusters in an X, scatters along token-seeded routes, then assembles
`#` and up to four digits. Default duration is 8 seconds (Sleepy/Zen: 12;
Joy/Silly: 7). Contrast follows the background. The badge is painted outside the
character shadow/motion group at the top left, scaled to 80%, not as an HTML overlay.
The X follows BanmaoBoxRenderer._logo's symmetric five-cluster layout, adapted
from its 5x5 grids to 3x3 grids: 45 visible 9-unit tiles on a 10-unit pitch.
Each 29-unit cluster sits on a 30-unit diagonal step, keeping corners close.
The logo is 89 units wide (71.2 after scaling); 30 hidden reserve cells split
from the grid during scatter to supply the full 75-cell token-ID geometry.
The outer badge transform anchors the animation at (8, 8) in the 512-unit artwork.
There is no badge backplate: the artwork background remains visible. The hash
uses extended crossbars and inset stems to distinguish it from a ladder.
The unanimated geometry is the readable token ID; reduced motion and static
rasterizers do not depend on an animation completing. Public renderer IDs above
9999 use a bounded text fallback, including full uint256 IDs.

The CSS generator must retain descendant whitespace before pseudo selectors
such as ` :is(...)`. Removing it silently disables on-chain limb animation.
Run the badge Jest suite as well as the existing suites; the local EVM tests
compare badge strings at digit boundaries and enforce deployment size limits.


## Mint uniqueness and preview boundary

The selectors and Randomize button explore examples only. They never reserve
artwork or pass traits to mint(address,address). Mint remains disabled here.
The NFT now draws four-layer combinations without replacement using a sparse
Fisher-Yates pool (constant work per mint), bounded to 9,216 combinations.
A reverted payment/receiver transaction also reverts the pool mutation.
Poses remain tokenId % 6; uniqueness does not rely on pose or token ID labels.
This guarantees distinct trait tuples within this collection, not global
copyright/exclusivity, or pixel distinction under every accessory occlusion,
animation frame and rasterizer. The public renderer can still render examples.
The seed is public and deterministic: mint timing/ordering can be used to target
traits. This is NOT a blind-mint/VRF fairness guarantee. A separate randomness
protocol is needed if outcomes must be unpredictable before payment.
The updated NFT needs a new deployment; existing immutable deployments cannot
be patched. The approved production manifest is still absent.

Review caveats: treasury rejection can block native mint; immutable payment
assets must be vetted (an adversarial token can lie about balances). ERC-165
checks only declare interfaces, not trustworthy immutable implementations.
Forced native funds or accidentally transferred tokens have no recovery path.
These local checks are not an independent comprehensive security audit.

The artwork (not the surrounding page controls) must use the same geometry,
layer order, pose transform, shadow and motion CSS as the on-chain renderer.
Do not add HTML overlays over the preview artwork.

## Immutable motion storage

Run `node scripts/generate-king-motion.cjs` after changing shared motion CSS.
The generator retains the canonical library source and emits two pure data
contracts. The renderer creates both in its constructor and stores immutable
references. Their concatenated content is exactly the original SVG style tag.
There are no CSS setters, external URLs or runtime library linking requirements.
The renderer constructor still accepts the original three layer addresses.

Both data contracts must satisfy EIP-170 (24,576 runtime bytes). Renderer initcode,
including constructor arguments, must satisfy EIP-3860 (49,152 bytes).
Never disable these limits in tests to accommodate new artwork.

## Body lighting polish

The face opening uses a self-contained radial gradient and a neutral dark rim
with a lower reflected highlight. Both rim paths remain behind the cat and ears.
The wider, low-opacity white shell highlight avoids yellow tint on alternate
body colors. These details need neither CSS animation nor SVG filters.
Mirror body edits in `artwork.ts` and `BanmaoKingBodyLib.sol`; update the body
artifact hash only for intentional artwork revisions. Thumbnail tests render
mixed traits at both 64 and 128 pixels. Existing immutable deployments do not
change when these source files are edited.

## Validation

- Run the four `banmaoKing` frontend/motion/polish/rig Jest suites.
- Run `__tests__/contracts/banmaoKing.security.test.ts` on the local EVM.
  It checks minted metadata, all catalogue entries, six poses, mixed-scene
  character strings, the CSS returned by both data contracts, and size limits.
- With the local app listening on port 3000, run
  `node scripts/audit-king-motion.cjs` for Chrome playback/reduced-motion checks.

Preview playback can be explicitly disabled or enabled under reduced motion.
The standalone NFT respects the viewer's system preference. Compare the same
traits, pose, viewport, motion preference and animation time. A marketplace
that rasterizes SVG will show a static image, not the browser animation.
These tests do not promise pixel-identical rendering across different browsers.

Deployment remains disabled until a separately reviewed production manifest
exists. Local EVM test deployment does not publish anything to a public chain.
