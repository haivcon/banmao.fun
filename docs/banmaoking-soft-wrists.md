# Soft wrist attachment and smaller feet

## Scope

- Both visible hind paws are 10% narrower, with unchanged Y coordinates, hip pivots and independent shuffle nodes. Hidden `cat-behind` legacy geometry is unchanged.
- Forearm distal edges now follow the authored wrist angle, including the existing +/-36 degree palm alignment. Cubic handles approach the palm along its attachment tangent. Shoulder anchors and wrist/prop sockets are unchanged.
- Forearm fill and exposed side contours share geometry; there is no outlined circular collar. Grip accessories 15 and 17 select a mutually exclusive right forearm variant matching their upright cupped palm.
- Shoulder-related flex is bounded at 4.5 SVG units. Existing independent wrist tracks, timings, discrete paw-pose changes and palm squeeze are retained. This is not IK or a full palm morph redesign.
- SMIL linearly interpolates the baked path coordinates using the same spline timing as wrist rotation. Attachment is exact at authored beats (up to rounding), approximate between beats; exhaustive visual seam/collision approval is still required.

## Sources and generation

`forearm-geometry.ts` defines attachment math used by secondary motion and the explicit `tools/soften-king-wrists.cjs` anatomy migration. Normal anatomy synchronization remains Solidity -> neutral-rig.json using `tools/sync-king-choreography.cjs`. Run `tools/sync-king-art-effects.cjs` after geometry or secondary motion changes; it also refreshes the Cyborg body.

## Rounded, fuller arms

Each forearm edge now has two tangent-continuous cubic spans, with a fuller middle instead of a triangular wedge. Shoulder and wrist pivots remain fixed. Both palms are scaled by 1.1 about local (0, -12), including all palm poses; accessory groups are not scaled. Distal forearm geometry uses matching scaled palm attachment coordinates. Existing grip paths are refreshed on every migration, and palm wrappers are inserted only once. The explicit anatomy migration was checked for idempotency. Feet remain unchanged by this follow-up.

## Deployment compatibility

The extra grip deformation exceeded EIP-170 with two expressions per secondary part. The router now requires **address[21]**, ordered SecondaryMotion0 through SecondaryMotion20, one expression per part (formerly address[11]). Update deployment tooling accordingly. Renderer constructor shape is unchanged. No live contract address, mint configuration or existing deployment was changed.

## Checks

Five focused Jest suites pass (111 tests): choreography, expressive rig, secondary motion, independent wrists and new soft-wrist attachment tests. Chromium playback validator passes all 21 expressions under normal and reduced-motion preferences. Generation freshness and whitespace checks were run. Local EVM exact string parity passes for all 21 secondary-motion expressions and the Cyborg body; Solidity runtime/initcode limits pass after splitting the parts. Renderer runtime remains 21,114 bytes and initcode with arguments 45,259 bytes. Full production build and exhaustive visual review of accessory combinations are not covered by these checks.
