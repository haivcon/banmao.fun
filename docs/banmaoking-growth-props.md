# Green Candles / Ruby Wine Glass

This revision targets a new deployment, not migration of an existing collection.
Public accessory IDs are consecutive catalogue ordinals 1–25; ID 0 is invalid.
None is 1, Bubble Blaster 20, Imperial Regalia 21, Mini Banmao 22,
Boxing Gloves 23, Green Candles 24 and Ruby Wine Glass 25. Former IDs 0–22
map to 1–23; candles and wine retain 24/25. The retired plant is not restored.
NFT mixed-radix sampling packs the ordinal directly. Composition codes encode
accessory IDs directly (the other trait groups remain zero-based and encode ID + 1).
Old candle/wine share codes must not be treated as the new format: their previous
accessory fields were 25/26. No deployed contract, stored NFT or old URL is migrated.
Canonical SVG dispatch indices and data-accessory CSS hooks remain private artwork
indices, converted at the frontend preview and public accessory-contract boundaries.
The catalogue has 133875 combinations. maxSupply remains a constructor input.

BanmaoKingGrowthProps.sol owns both artworks. AccessoryExtraPart renders their
front layers. The renderer adds rising candles through its world-effects helper,
after all character transforms close. Both accessories preserve the canonical
shoulders, deforming forearms and palms, selecting the right palm's cupped pose
without replacing either arm. The left arm retains expression choreography.
ID 25 is Ruby Wine Glass (Ly vang ruby). Translucent crystal, a gold rim and ruby wine replace the rejected trophy. Attached glints and the liquid surface animate on a three-second SMIL clock. Existing arm/lean and full-turn counters keep the glass upright at the right grip socket.
The main candle base sits 10 SVG units outward and 14 toward the fingers from
its former wrist anchor, following the arm at (379,359). World candles are unchanged.
Its held-wrist node cancels arm/lean
rotation, and the nested turn counter cancels the full tumble at the same socket:
the flame stays vertical. No replacement fingers are painted over the original paw.
No runtime JavaScript is embedded in the SVG.

Run from the repository root:

- `node tools/sync-king-growth-props.cjs` exports actual local-EVM return bytes.
- `node tools/sync-king-growth-props.cjs --check` verifies the mirror, no writes.
- `node tools/check-king-accessory-layout.cjs` deploys the accessory graph under
  standard limits, checks 24/25 SVG/names/rear layers and rejects 23/26/255.
- `node tools/test-king-growth-browser.cjs` tests canonical arms, anatomical sockets and three wine shine cycles, world-space
  candle ancestry, 42 expression compositions, and changed image pixels during
  standalone SVG playback. Results and screenshot are in test-results/growth.

Wine optimized runtime sizes observed during compilation: AccessoryExpansion 20762, ExtraPart 8246, AccessoryBasePart 18430, AccessoryLib 19371 bytes. Complete graph deployment remains blocked by existing Renderer, CyborgBody and BodyLib size issues. The historical baseline is unchanged.
Full rendered-image pixel parity between EVM renderer and preview is not asserted
by the fragment export test. Cross-browser visual quality still needs review.
