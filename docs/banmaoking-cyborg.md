# Cyborg Suit v1 — source implementation, not a deployed upgrade

Body ID 4 retains its existing silhouette, rig, Titan armor and accessory anchors.
Hybrid has one organic eye and one mechanical eye; Full Machine adds bilateral
mechanical optics, scoped metal recoloring and face seams. All 21 expression IDs
have distinct static lens artwork, with a slow opacity pulse that is not required
to read the emotion. Existing mouths and expression effects remain in the scene.
A local even-odd clip removes the original expression from the replaced eye
region; the old fixed Titan eye is no longer appended. This is region clipping,
not a rewrite of the underlying expression catalogue.

## Fixed assignment

Both implementations use the low bit of
`keccak256(abi.encode("banmao-cyborg-v1", uint256(tokenId)))`:

- 0: `Hybrid`
- 1: `Full Machine`

The domain and encoding must not change after deployment. Form does not depend
on expression, accessory, background, time or rerendering. Expected allocation
is 50/50, not a guaranteed quota. This is public deterministic assignment, not
VRF, anti-sniping entropy or a change to mint randomness. The same token ID has
the same form across collections using this version. Frontend inputs must be
nonnegative safe integers; Solidity accepts uint256.

`Cyborg Form` is appended to renderer attributes only for body 4. The studio
preview shows the form next to its preview token ID. Existing trait IDs, packed
mint traits, interfaces and deployed addresses are unchanged.

## Canonical implementation

- Frontend: `app/collection/banmaoking/cyborg.ts` and `cyborg-contract.json`.
- Solidity: `contracts/BanmaoKing/Lib/BanmaoKingCyborg.sol`.
- Body integration: `artwork.ts` and `BanmaoKingBodyLib.sol`.
- Expression integration: `smil-preview.ts` and `BanmaoKingRenderer.sol`.

The eye contract is an immutable constructor child of the renderer. Frontend
preview IDs are namespaced through the existing preview mechanism. Full Machine
CSS is scoped to its form wrapper; no rig geometry or global selectors change.
The old exported Titan eye asset remains available as a legacy reference.

## Validation and release blockers

Local validation with solc 0.8.30, optimizer enabled / runs 1, Shanghai:

| Contract | Runtime bytes | Initcode bytes |
| --- | ---: | ---: |
| BanmaoKingCyborgEyes | 10,297 | 10,325 |
| BanmaoKingBodyLib | 20,692 | 85,550 |
| BanmaoKingRenderer | 40,099 | 51,861 |

Compilation succeeds, but the whole collection is **not release-ready** under
standard EIP-170 / EIP-3860 limits (24,576 runtime / 49,152 initcode bytes).
BodyEffects, the existing CyborgBody and expression deployment children also
produce size warnings. Split/inject large render components and remeasure with
the actual deployment settings before any deployment. Do not bypass size limits
to claim production deployability.

The new eye contract and a resolver/finish harness deploy on size-limited local
Ganache. All 42 form/expression strings match frontend byte-for-byte; resolver
and body-finish output match for sample IDs including MAX_SAFE_INTEGER.
Chrome parses all 42 SVG previews without XML errors and checks eye counts and
opacity animation at 0, 4 and 8 seconds. Local Jest coverage includes form
stability, invalid input, expression differentiation, all public accessories,
ID uniqueness, absence of legacy eyes, and other bodies.

Full renderer/NFT deployment, end-to-end tokenURI gas/size measurements and
live-chain compatibility are **not validated**. A complete collection rollout
requires those checks after architecture size fixes.

The current NFT source declares `renderer` immutable. Configuration references
an existing deployed collection; changing source does not update that collection
or its NFTs. No deployment transaction, address migration, commit or push was
performed. Do not publish the new preview as proof that existing on-chain art
has changed. Existing NFTs require a separately approved migration/new collection
strategy; the deployed bytecode itself has not been reverified in this task.
