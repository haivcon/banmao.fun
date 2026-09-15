# Royal catalogue: contract-first source

Current source adds body 16 (King's Gold), accessory 20 (Imperial Regalia), and background 16 (Throne Room). Expression 20 remains Royal Decree. Both new NFT mint source and preview now have **17 × 21 × 21 × 17 = 127,449** combinations.

`contracts/BanmaoKing/Lib/BanmaoKingRoyalLib.sol` is authoritative for the royal material, mantle, regalia, throne, and their embedded animation. Separate `BanmaoKingRoyalAccessory` and `BanmaoKingRoyalBackground` contracts keep runtime sizes bounded. The accessory/background facades create these immutable dependencies; the renderer's six constructor arguments are unchanged.

Run `node tools/sync-king-royal.cjs` and `node tools/sync-king-identity.cjs` after editing the Solidity sources. Their `--check` modes reject stale frontend output. These tools are outside the ignored legacy scripts directory. Legacy frontend-to-Solidity generators must not overwrite these contract-authored additions. Older expression and scene pipelines are not yet entirely contract-first; this migration makes royal artwork and corner identity contract-first, not all existing artwork.

The token badge retains its original 8-unit inset. Only the assembled X logo moves: its internal top-left is (386,25), aligned with the token digits; scatter positions and digit geometry remain unchanged. The composition watermark changes from (490,497), size 13 to (506,505), size 11. The contract-defined light/dark palette covers all 17 backgrounds; opposite-color outlines improve legibility over local background details.

## Deployment boundary

No public deployment is performed or confirmed. Existing immutable contracts do not gain these traits. The revised NFT source is for a **new deployment**: its draw pool and mixed-radix mint selection use the expanded catalogue. Do not reinterpret old mint combinations using the new radices. Stored four-byte packed trait IDs and existing trait ordinals are unchanged. Keep historical contract versions and deployment records when supporting already minted tokens.

## Validation

`node tools/validate-king-royal.cjs` compiles with optimizer runs 200 / Shanghai, checks runtime and initcode limits, deploys locally, compares royal layer output byte-for-byte with the downstream JSON, checks all six royal body poses, and rejects out-of-range IDs. Jest coverage checks downstream freshness, preview layers, unique peel IDs, reduced-motion markup, and corner layout. This is not a completed production release/security audit or full animated visual review.
