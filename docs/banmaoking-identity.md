> Current royal-source revision: Solidity and new mint source now include 17 bodies × 21 expressions × 21 accessories × 17 backgrounds (127,449). Royal artwork and corner identity sync from contracts to frontend. Older preview-only/count statements below describe the preceding revision. No public deployment is confirmed. See [royal contract migration](banmaoking-royal-contract.md).

# Banmao King identity and supply

## Composition codes (current behavior)

Bottom-right labels are **composition codes**, not token IDs: `banmao-01020302` means body 01, expression 02, accessory 03, background 02. Catalogue array indices are zero-based internally; public ordinals start at 01. Entries must remain append-only; never reorder existing IDs. Each field is exactly two digits.

Studio accepts `?code=banmao-01020302#king-studio`, renders unminted combinations offline and exports SVG. Codes encode four traits, not pose, ownership, mint status or a mint selection. Export uses default pose; minted images retain their token-dependent pose. Token ID remains top-left. Minted composition codes derive from canonical metadata traits, never the studio selection. Unknown metadata traits fail closed rather than inventing an identity.

The bottom-right overlay is a composition code, not another token-ID label. This behavior is implemented in preview and current Solidity source; deployed immutable artwork does not change.


- Lookup: `/collection/banmaoking?token=42#king-lookup`. Reads tokenURI and ownerOf from the configured collection on X Layer, at one block snapshot. No wallet or transaction required.
- Token IDs identify minted NFTs within that collection, not arbitrary unminted Theme Lab designs. An image is not proof of ownership.
- Preview downloads include a bottom-right composition code; original downloads retain the exact on-chain SVG.
- The source renderer includes the composition code as well as the separate token badge. Existing immutable deployments are not changed by editing source.
- Logo coordinates are quarter-scaled only in the logo phase and its tiles match the 4-unit digit cells. Digit and scatter phases remain unchanged; five clusters each retain nine visible tiles.
- Current Solidity source: 16 bodies × 21 expressions × 20 accessories × 16 backgrounds = 107,520 combinations. Theme Lab preview: 17 × 21 × 21 × 17 = 127,449. Royal Decree is expression ID 20 in both; the extra royal body/accessory/background remain preview-only. Neither count is totalSupply. Mint UI reads totalSupply and maxSupply from the configured contract; source catalogue updates do not modify historical token decoding.
- Deployment manifest and transaction configuration guard remain unchanged. A new deployment requires independently validated addresses and maxSupply before enabling mint. No public deployment or migration is performed by this change.
- New lookup copy uses Vietnamese for `vi`, English fallback for other locales.
