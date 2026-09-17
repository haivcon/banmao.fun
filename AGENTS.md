# Banmao King artwork changes

- Contract-first: Solidity renderer output is the canonical NFT artwork. Fix and validate contracts before synchronizing frontend previews.
- Exported SVG must be self-contained. Do not use runtime JavaScript particles to mask differences from on-chain SVG.
- Emitted particles must leave all animated character ancestors. Sample all launch transforms (arm, wrist, recoil, lean, lift, volume and full turn); ensure repetition remains aligned with every relevant cycle.
- Preserve trait IDs: Bubble Blaster 19, Imperial Regalia 20.
- Validate standalone SVG image playback, not only inline React previews. Report unverified checks explicitly.
- Synchronization scripts must not silently overwrite canonical Bubble Blaster Solidity artwork from frontend files.

## Solidity artwork ownership after consolidation

- The eight former standalone artwork libraries now live as internal namespaces in existing owner files: SakuraGarden in BackgroundExpansion; CosmicSuit, NatureSuit and TitanSuit in BodyEffects; BodyTips in BodyLib; NewAccessories in AccessoryExpansion; BubbleLaunch and BubbleFlight in ArtUpgrade. Do not recreate their old source files.
- `BEGIN CANONICAL` / `END CANONICAL` sections are preserved by generators. Bubble baking replaces only the BubbleLaunch section in ArtUpgrade.
- AccessoryLib owns a constructor-created AccessoryBasePart (IDs 1–6); AccessoryExpansion owns a constructor-created AccessoryExtraPart (IDs 21–22). These are real child deployments, not external linked libraries. Existing constructor arguments are unchanged; Expansion.render is now view.
- `tools/check-king-accessory-layout.cjs` validates actual accessory deployments under standard size limits and exact SVG output.
- Full deployment remains blocked by pre-existing CyborgBody runtime, BodyLib initcode and Renderer runtime size excesses. Do not claim the complete graph is deployable. `tools/check-king-art-layout.cjs --baseline` captures local comparison data; normal mode compares it and fails on deployment size blockers.

## Bubble Blaster validation and current audit

- `tools/bake-king-bubble-launch.cjs --check` validates launch records against Solidity choreography, direction, scale and anatomy grip socket. Sampling is build-time only. Integer coordinates have sub-pixel rounding error; browser validation requires <2 SVG units over repeated cycles.
- `tools/sync-king-bubble-flight.cjs` compiles/deploys ArtUpgrade to a local in-memory EVM and exports its exact returned SMIL bytes. `--check` compares without writing. No wallet or public-chain deployment is used.
- `tools/test-king-bubble-browser.cjs` checks all expressions, both hands, repeated-cycle muzzle alignment, visible SMIL particles and standalone SVG image decoding. Image decoding alone is not a visual playback assertion.
- Emission periods are whole expression cycles, at approximately four alternating emissions per second. The old independent .65s barrel recoil was removed to avoid a second unsynchronized launch period. Restore recoil only with phase-locked launch sampling and corresponding tests.
- Audit: music-note particles (accessory 8 in scene.ts), AK bullet trails (6 in accessory-action.ts), wand sparks (9) and coffee steam (17) still use character/accessory-local transforms. Do not claim these are world-space emissions. Their intended attachment versus free-flight behavior needs individual contract-first fixes.
- Birthday confetti is already composed outside the character via the renderer's world-effects helper; background effects are also outside the character. Attached highlights, tank liquid and wand orbit are intentionally local.
- `sync-king-art-effects.cjs` still generates non-Bubble artwork from TypeScript. Its Bubble preflight prevents stale mirrors, and its regeneration preserves the Solidity flight API, but this does not make the entire pipeline contract-first.


## Frost catalogue revision

- Frost Suit is body 14; its canonical namespace FrostSuit lives in BodyEffects. Export via tools/sync-king-frost-suit.cjs; never author its preview independently.
- Carnivorous Plant accessory 23 is removed and invalid, not remapped. Accessories 19/20 retain their IDs. This catalogue revision targets a new deployment, not migration of existing NFTs.
- Counts: 15 bodies, 21 expressions, 23 accessories, 17 backgrounds = 123165 combinations. NFT maxSupply remains a constructor setting bounded by this total. Mini companions exclude accessory 21 and never emit 23.
- The original art-layout baseline is historical: intentional Frost bytecode changes fail its relocation-only equality check. Do not overwrite it to hide size blockers.
