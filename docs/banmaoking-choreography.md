# Expression-owned choreography

The live renderer and preview no longer route through tokenId % 6. The 21 expression ordinals own their full-body tracks. Trait packing and catalogue size are unchanged.

Canonical profiles: `contracts/BanmaoKing/Lib/BanmaoKingChoreography.sol`.
Canonical neutral geometry: `contracts/BanmaoKing/Lib/BanmaoKingAnatomyPart.sol`.
Run `node tools/sync-king-choreography.cjs` after editing either; use `--check` in CI. Frontend choreography markup is checked against deployed EVM output by `node tools/validate-king-choreography.cjs`.

Seven beats describe rest, preparation, accent, follow-through, hold, recovery, rest. Left/right arms pivot at shoulders (174/338,302); legs at hips (190/322,419); tail at (318,383). Whole-character translation and rotation target separate nested groups. Token ID remains an identity input, not an action selector. The body API retains its numeric compatibility argument but ignores it for geometry.

| Expression | Action |
|---|---|
| Happy Smile | Friendly Wave |
| Joy | Joyful Jump |
| Wink | Playful Wink |
| Love Eyes | Send Love |
| Sleepy | Sleepy Yawn |
| Surprised | Startled Recoil |
| Determined | Ready Stance |
| Teary | Wipe Tears |
| Silly | Silly Shuffle |
| Cool Gaze | Cool Salute |
| Starstruck | Starstruck Bounce |
| Zen | Zen Breathing |
| Cosmic Wonder | Cosmic Reach |
| Diamond Gaze | Diamond Flourish |
| Focused Coder | Focused Typing |
| Monday Mood | Monday Sigh |
| Suspicious | Suspicious Scan |
| Blushing | Shy Sway |
| Determined Grin | Victory Pump |
| Dreaming | Dream Drift |
| Royal Decree | Royal Command |

Existing expression facial/detail effects are preserved. All BanmaoKing previews and exports are animated-only. The reduced-motion hook, SVG freeze utility, fourth preview argument and motion override attributes have been removed. OS motion settings cannot select a static NFT. The studio remounts its SVG whenever any trait or token changes. Whole arms use the original curved silhouette behind the shell, with no foreground arm overlay; expression-owned joints remain unchanged.

Legacy SMIL/parts generators fail closed rather than restoring the old pose system. The expression generator no longer rewrites anatomy. Historical six-pose tests/scripts need migration before they can represent the new system; a full legacy test-suite pass is not claimed.

## Open-palm gestures

Friendly Wave and Playful Wink reveal the right palm. Joyful Jump, Send Love, Startled Recoil and Starstruck Bounce reveal both palms. Their accent angles keep the paws extended outside the shell rather than folded against the face. Pink central/toe pads are children of the existing paw geometry; two opacity tracks share the expression timing, with no extra joint transforms or foreground arm duplicates. Other expressions keep the pads hidden.

Validation: 65 focused Jest tests, Chrome accent-opacity/attachment and playback checks under both OS motion preferences, all 21 EVM/frontend choreography strings, Solidity compilation/size checks and local royal-layer parity passed. Full-page visual/accessory occlusion review and production deployment remain outstanding. The TypeScript command exceeded the tool timeout in this update.

## Animated-only update

63 focused Jest tests pass; Chrome confirms playback with OS reduced motion both on and off. The legacy `king-smil.test.cjs` currently fails generated-motion parity and phase-one pivot expectations; these are not certified by this update.

## Verified

- 22 choreography tests, including joint ownership across 21 expressions × 21 accessories.
- Always-animated frontend regression: passes (23 tests total with choreography). Expression/badge rerun exceeded the command timeout; previous pass counts are not independently confirmed.
- Chrome playback validator: all 21 arm tracks and rear paint ordering, live autoplay and SVG remount restart, with reduced-motion both enabled and disabled.
- All 21 choreography strings and action names exactly match a locally deployed EVM motion contract.
- Solidity optimizer runs=200 / Shanghai compilation and deployment size checks.
- TypeScript noEmit and whitespace checks.

## Remaining visual work

The generated inline SVG has been exercised in Chrome with studio CSS; the full Next.js page, production build/deployment and other browsers were not verified. Existing face/detail effects were retained rather than replaced with 21 new particle systems. Held props remain character-attached rather than hand-attached; accessory occlusion still requires visual review. Ground shadow is currently static. There is no reduced-motion/static NFT mode. These limits should be addressed before treating the choreography as visually production-approved.

## Paw silhouette revision (2026-09-15)

Canonical anatomy now uses curved forearms and separate wrist nodes nested under the rear shoulder groups. Paw placement is (143/369,380), with local wrist rotation about (0,-12). Static placement and animated rotation use different nodes so SMIL does not overwrite attachment. Relaxed, open and cupped silhouettes are mutually exclusive discrete opacity tracks; pads remain children of the wrist. There is no foreground limb or independently animated pad transform.

Friendly Wave holds the shoulder steadier and waves at the wrist; Playful Wink adds a short wrist flick. Joyful Jump and Starstruck Bounce use asymmetric raised arms. Startled Recoil opens palms beside the face. Send Love cups then opens beside the shell rather than reaching through it. Elbow articulation is not added: the forearm curve remains continuous to avoid a visible joint seam.

Validation for this revision: 44 focused Jest tests pass. Chromium playback/rear-order checks pass for all 21 expressions under both motion preferences, and the 21 EVM choreography strings match the frontend. Contact sheets at `test-results/king-paws/before.png` and `after.png` show rows 0,1,2,3,5,10 and columns at loop fractions 0,.30,.43,.58. Full-page accessory occlusion across every combination and production deployment are not certified. Whole-repository typecheck exceeded the tool timeout; earlier verification statements above are historical, not a certification of this revision.

