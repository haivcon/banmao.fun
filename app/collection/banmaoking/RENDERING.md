## Accessories 06–08: clipped hat and grouped ornament motion

Canonical revised geometry lives in `accessory-polish.ts`, imported by `scene.ts`;
`generate-king-smil.cjs` mirrors these three branches into the accessory contract.
Party stripes are 4.5 units, clipped to the cone, with its 3.5-unit outline drawn
last. The hat rocks +/-2 degrees; the nested pom moves 3 units; two confetti groups
have different paths/phases. The chain has two-tone shading and link separators,
a fixed connector and a grouped pendant rotating +/-6 degrees about (256,330).
The leaf has thinner veins and rotates -7 to +9 degrees about (323,337), outside
its authored scale transform so veins/highlight stay attached. Independent leaf
path morphing and chain deformation are intentionally not included in this pass.
New groups have class-based reduced-motion transform resets for scoped previews.

Latest compilation: renderer runtime 18,142 bytes, initcode 48,396 + 96 constructor
bytes = 48,492 (660 bytes below EIP-3860). Accessory runtime 16,995; MotionPart0
17,804; MotionPart1 11,533. Optional SMIL omits default evenly spaced keyTimes and
zero begin values to conserve space without changing timelines. No deployment.
Browser visual playback/collision QA remains outstanding for these revised shapes.


## Accessory effects revision

Each selected accessory now receives authored SMIL rather than a generic rotation:
ruby/knot/moon color breathing; glasses glints translate; pixel lights chase with
1.8-second staggered pulses; confetti drifts 9/20 units; chain highlights travel
5/-3; leaf breeze travels 14/-9; headphone wave stroke width pulses 2–5; magic
rises 12 units; halo aura radius expands 81–91 with opposing star drift and a
2.8-second sweep. Bow/wizard rotations peak at 11.2 degrees, cape at +/-14,
with continuous spline easing over 2.6 seconds. Geometry remains unchanged.
This animates accessory effects, not the entire chain, leaf or crown silhouette.

Validated: 50 Jest SMIL tests, 11 Node tests, Solidity compilation. Renderer
initcode is now 48,023 bytes + 96 constructor bytes = 48,119 (limit 49,152).
MotionPart0 runtime is 17,431 bytes (limit 24,576). Browser visual QA and public
deployment were not performed for this revision. Source edits do not update
immutable deployed artwork. Numeric results below describe older revisions.


## Motion upgrade (current workspace)

Secondary ear/tail/whisker motion now uses expression periods and nonstationary
intermediate poses. Limb amplitudes are stronger; every standing pose has foot
rotation, while March retains translation. Preview and renderer substitute the
same expression period into limb and tail SMIL. Front hands retain arm timing.
Mouth/rest-eye morphs have two peaks; Teary includes moving tears. Every background
has floating particles. Optional details move, pixel pulses are staggered, and
bow/wizard/cape rotations are stronger. Fixed gems remain attached.

This is not the complete bespoke choreography proposed in discussion: pupil
tracking, double blinks, per-expression limb geometry, full accessory physics,
and individually animated background stripes/rays remain unimplemented.
No public deployment was changed. Renderer motion pose/tail methods now accept
an expression argument; regenerate dependent artifacts before deployment.

Validation: 50 SMIL Jest checks and 9 Node checks passed. Compiler runtime sizes
remain below 24,576 bytes; renderer initcode is 44,472 bytes before its 96-byte
constructor arguments. Full typecheck and local EVM validation timed out in the
30-second tool window; browser playback has not yet been visually verified.


## Phase 1: stronger existing motion

The shared character breathing peak is now -3.5 SVG units (previously -1.5).
Tail rotation peaks at 5 degrees; ears at -8/+7 degrees; whiskers at -3.5/+3.
Wizard tip rotation is 4 degrees and cape panels rotate +/-6 degrees. Existing
pivots, periods, static geometry, pose gestures and reduced-motion rules remain.
Happy Smile and Silly mouth curves have stronger peaks; ellipse mouth radii
increase by 5 units (large) or 2 (small). No new animation elements are added.
Expression-specific limb choreography and new background effects are not part
of this phase. Source changes do not update immutable public deployments.

The ExpressionLib size warning below is historical: the current workspace has
three ExpressionPart contracts. Compile the regenerated artifacts to measure
actual byte budgets; changing numeric literals does not guarantee equal bytes.


## Breathing and blush SMIL update

The character wrapper now translates from 0 to -1.5 SVG units and back with
expression-dependent periods (2–8 seconds), without replacing pose transforms.
Happy Smile, Joy and Love Eyes retain their authored blush geometry and pulse
opacity from .3 to .44 and back over 5.2 seconds. Both cheeks share the same
phase. Other expressions do not receive blush. Static previews strip SMIL;
class-based reduced-motion rules reset these two new effects even with scoped IDs.

Regenerate with `node scripts/generate-king-smil.cjs`. The generator interns the
complete blush pair to avoid extra Solidity concatenation overhead. Current
ExpressionLib runtime is 24,548 bytes: only 28 bytes below EIP-170. Compile and
check byte budgets before adding any further face effects. No public deployment
has been changed; immutable deployed artwork is not updated by source edits.


## Current SMIL source (supersedes legacy CSS notes below)

Artwork motion is generated from `scripts/king-smil.cjs` into the two immutable
MotionPart contracts and `smil.ts`. `smil-preview.ts` uses the same motion data,
scopes SVG IDs per preview, and removes animation elements when playback is off.
The NFT emits accessory/background SMIL only for the selected traits; every
local reference must resolve within its standalone SVG. Pixel tiles and halo
stars have distinct target IDs.

The 8-second badge cycle starts with readable digits, scatters, holds the
45-tile five-cluster X, scatters again, and reassembles the digits. Base SVG
attributes are the static fallback. A small CSS media rule (not CSS animation)
overrides animated transforms/opacity/size for prefers-reduced-motion. The
preview defaults to that preference and permits an explicit playback override.
No script is embedded in NFT SVGs. Pose transforms remain outside moving groups.

Canonical face geometry/timelines live in `motion.ts`, and six pose/tail
timelines in `anatomy.ts`. Eyes switch between actual open/closed shapes;
Wink, symbolic eyes and rest eyes retain their distinct semantics. Mouth and
tail paths morph with matching command topology. Front hands reuse their arm
timeline; only March lifts feet. Generators extract pose/tail timelines into
MotionPart1 to keep the body catalogue within EIP-170. Assign SVG target IDs
before escaping/interning Solidity literals; emit limb targets only where an
extracted timeline needs them. Do not relax EIP-170/EIP-3860 limits.

Validation commands:
- `node scripts/generate-king-anatomy.cjs && node scripts/generate-king-smil.cjs`
- `node --test scripts/king-smil.test.cjs scripts/banmaoking-tooling.test.cjs scripts/banmaoking-explorer.test.cjs`
- `npx jest --testPathPatterns=banmaoKing --runInBand`
- `node --test scripts/king-smil.test.cjs scripts/king-smil-overhaul.test.cjs`
- `node scripts/king-smil-overhaul-validation.cjs` (local EVM; persists all 12 × 6 SVGs and exact tokenURI roundtrips under `test-results/king-smil/overhaul`)
- `python scripts/king-smil-overhaul-xml.py` (independent XML, ID/reference, timeline, hash and roundtrip read-back)
- `node scripts/king-smil-validation.cjs` (local EVM; writes ignored browser fixtures)
- `node scripts/audit-king-motion.cjs` (Chrome CDP; normal/reduced-motion assertions)

Chrome checks rendered on-chain SVGs for XML validity, actual tail transforms,
X-logo phase, static digits and reduced-motion behavior. This does not certify
Firefox/Safari, marketplace sanitizers, or thumbnail animation. Representative
validation covers all trait values and six poses, not all Cartesian combinations.
The separate security suite exhausts all 9,216 mint allocations.

RPC budget is a release gate: the 75-cell SMIL badge substantially increases
SVG/metadata generation cost. A measured representative 9216 view consumed about
21.4M renderSVG gas / 40.8M tokenURI gas before the additional eye-blink element.
Use the latest validation log for current values; provider call-gas/response caps
must be tested before deployment. No public deployment or address was changed.

---
## Historical CSS design notes (not current SMIL behavior)


> Working-source update: the on-chain renderer now uses SMIL via local fragment IDs and two immutable motion data contracts. The CSS parity descriptions below document the legacy frontend/release, not exact motion parity with the new source. Geometry is retained; timing is re-authored, the badge currently scatters and reassembles without the X-logo phase, and standalone SMIL does not yet honor reduced-motion. No deployment address has changed. Run `node scripts/generate-king-motion.cjs` to regenerate SMIL, and `node --test scripts/king-smil.test.cjs` for generator checks.


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
