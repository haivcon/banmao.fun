# Smart Contracts

This directory contains Solidity smart contracts for the Banmao ecosystem.

## Contracts

### BanMaoSnake.sol
Snake game reward distribution contract with:
- EIP-712 signature verification
- Daily per-player caps (5000 tokens)
- Hourly system-wide caps (50000 tokens)
- Minimum claim threshold (100 tokens)

### `banmaobox/` — BanmaoBox system

A permissionless system for transferable, time-locked ERC-20 gift boxes:

- Anyone may call `BanmaoBoxFactory.createTokenBox(token)` to deploy the canonical collection for an ERC-20. Each token can have only one collection across the Factory's full `previousFactory` registry chain.
- A replacement Factory keeps its predecessor registry discoverable through `boxForToken(token)` and `isTokenBox(box)`. The fallback is read-only: predecessor entries are not copied into the replacement Factory's storage.
- Collections are full, non-proxy deployments permanently bound to one **primary** token. The Factory deployer is the immutable renderer admin for every collection. It may update the Factory's `defaultRenderer` for subsequently created collections and may replace only the SVG renderer of an existing collection; it has no token upgrade, withdrawal, pause, custody, or metadata-attribute authority.
- A creator may call `createBox(recipient, amount, lockDurationSec)` for one primary-token-only NFT, `createBoxes(recipients, amounts, lockDurationSec)` for 1–20 primary-token NFTs sharing one duration, or `createMultiTokenBox(recipient, tokens, amounts, lockDurationSec)` for a basket of 2–5 distinct ERC-20s.
- Batch creation validates every row, pulls the aggregate primary-token amount once, and safely mints consecutive token IDs atomically. A failed ERC-20 transfer or ERC-721 receiver callback rolls back the entire batch.
- Successful mints use the ERC-721 `Transfer` event for initial NFT discovery and do not emit a redundant `MetadataUpdate`; ERC-4906 recommends omitting that event during mint. `refreshMetadata(tokenId)` remains permissionless for every live box, including while locked, so an indexer can explicitly recrawl time-dependent metadata without changing custody or box state.
- Locks must be greater than zero and may be at most `100 * 365 days` (36,500 days, slightly less than 100 Gregorian years because leap days are not included). There is no early unlock or privileged recovery path, so integrations should require explicit duration review before submission.
- Every basket's first asset must be the collection's primary token. This preserves canonical discovery and primary-token accounting while allowing up to four additional assets.
- Deposits and releases are exact-balance checked independently for every asset. A release succeeds only when the collection balance decreases and the owner's balance increases by the full recorded amount. Tokens that begin charging an outbound fee remain in the live NFT for retry instead of silently reducing its liability. The collection exposes remaining contents through `getBoxAssets(tokenId)`.
- After `unlockTime`, the owner or an approved ERC-721 operator may call `openBox(tokenId)`. Every transferable asset is paid to the current NFT owner; an asset that fails remains in the live NFT and can be retried without rolling back successful releases. Each batch payout has a 500,000 gas cap and copies at most 256 bytes of failure data so a hostile token cannot consume the entire basket operation with unbounded returndata.
- `openAsset(tokenId, assetIndex)` releases one selected asset and is the recovery path when another basket token is paused, blocked, or gas-griefing. The owner or an approved ERC-721 operator may release, but only the current NFT owner—not an approved address or operator—may call `abandonAsset(tokenId, assetIndex)`. Abandonment detaches a stuck asset without attempting a transfer and records the amount in `recoverableAbandoned(owner, token)` while `totalLockedByToken` continues to include that claim. The same owner can use `claimAbandonedAsset(token)` as a last-resort payout: the collection must lose the full recorded amount, but an outbound fee is accepted if the owner receives a positive amount. `AbandonedAssetClaimed` reports both the liability settled and the amount actually received. Both removal paths use swap-and-pop. Integrations should use the guarded four-argument overloads `openAsset(tokenId, assetIndex, expectedToken, expectedAmount)` and `abandonAsset(tokenId, assetIndex, expectedToken, expectedAmount)`, which revert with `AssetStateMismatch` if a cached index now identifies another asset.
- The NFT is locked against transfer and burn while a payout is executing, preventing token callbacks from changing ownership mid-release. The NFT burns and its `boxDetails` are deleted only after the final remaining asset is released or moved into its owner's recoverable claim. Releasing or abandoning the primary asset immediately clears `boxDetails[tokenId].amount`. `BoxOpened.amount` reports primary tokens paid in the transaction that emptied the box, so it is zero when the primary asset was released earlier or abandoned; historical release, abandonment, and claim data remains available through events.
- ERC-20 transfers sent directly to a collection cannot be attributed safely because standard ERC-20 transfers provide no receiver callback or authenticated sender record to the recipient contract. `untrackedSurplus(token)` exposes balances above all live-box and recoverable-claim liabilities, but the immutable no-admin design deliberately provides no sweep authority that could seize an accidental transfer.
- Metadata includes the snapshotted token symbol, underlying token contract address, creator wallet, and UTC start/unlock dates. The creator is permanently captured from `msg.sender` at mint and does not change when the NFT is transferred. Symbol display is sanitized and never controls custody. `onchainTokenURI(tokenId)` preserves canonical fully on-chain base64 JSON and SVG, while standard ERC-721 `tokenURI(tokenId)` returns the fixed production HTTPS metadata proxy URL so marketplace crawlers can fetch the metadata. The proxy reads `onchainTokenURI`, validates the decoded JSON and embedded base64 SVG image, and preserves that canonical image unchanged. The raw on-chain SVG also remains available through `renderSVG(tokenId)` and the separate HTTPS SVG route remains an alternative renderer endpoint.
- There is no admin withdrawal, early unlock, or collection upgrade path. Only the SVG renderer is replaceable as described below.
- Deposits and payouts reject transfer discrepancies. A payout requires both the collection's decrease and the owner's net increase to equal the exact recorded amount; otherwise the asset remains locked and retryable.

Security and integration assumptions:

- Rebasing, blacklistable, pausable, fee-changing, or upgradeable ERC-20s can change behavior after deposit. A failing asset remains claimable for later retries, while unrelated assets are released independently. If every batch attempt fails, `openBox` preserves the failure events and leaves the NFT and accounting unchanged; use `openAsset` for an isolated retry when appropriate. BanmaoBox cannot bypass token-level rules and intentionally has no privileged rescue path.
- `decimals()` must succeed and return at most 69. `symbol()` is optional for display: invalid, unsafe, or overlong values fall back to `TOKEN`.
- `ERC721Enumerable` enables bounded `getBoxesByOwner(owner, offset, limit)` reads but adds storage gas to mint, transfer, and burn.
- The Factory's initial and replacement default renderers must advertise both `IBanmaoBoxRenderer` and `IBanmaoBoxSVGRenderer` through ERC-165. The Factory deployer may call `setDefaultRenderer(newRenderer)` to affect only future collections; it emits `DefaultRendererUpdated` and never mutates existing collections. A collection's initial metadata/attribute renderer is immutable, while the same admin may call `BanmaoBox.setRenderer(newRenderer)` with a contract advertising `IBanmaoBoxSVGRenderer`. This changes the SVG returned by `renderSVG(tokenId)` and `image`, and emits `RendererUpdated` plus ERC-4906 `BatchMetadataUpdate`; all other metadata fields and attributes remain controlled by the collection and initial renderer.
- Multi-token support adds `assetCount` to the renderer payload and therefore changes the renderer ERC-165 interface ID. Pre-basket renderer/factory/collection deployments are intentionally incompatible and must not be mixed with this release.
- Factory runtime includes the `BanmaoBox` creation bytecode used by `createTokenBox`, so any Box bytecode change also changes the Factory artifact even when `BanmaoBoxFactory.sol` itself is unchanged. An unchanged deployed Renderer may be reused by replacement tooling only after its exact runtime matches the current Renderer artifact.
- `unlockTime` is stored as `uint64`; lock duration is capped at exactly `100 * 365 days` (36,500 days).

Deployment order:

1. Compile with optimizer enabled (`runs: 200`) and the Shanghai EVM target.
2. For testnet only, deploy `MockBanmao` from `contracts/banmaobox/MockBanmao.sol`.
3. Deploy `BanmaoBoxRenderer` (no constructor arguments). For a replacement whose Renderer artifact is unchanged, reuse the current manifest Renderer only after exact runtime verification.
4. Deploy `BanmaoBoxFactory(rendererAddress, previousFactoryAddress)`. Use the zero address for the first Factory and the current Factory address for a registry-preserving replacement.
5. Call `createTokenBox(tokenAddress)` for each token not already present anywhere in the predecessor chain, or let any community member do so permissionlessly.
6. Read `boxForToken(tokenAddress)` and verify all source and addresses on X Layer Explorer.

X Layer release tooling is versioned as `scripts/deploy-banmaobox-mainnet.cjs`
and `scripts/verify-banmaobox-mainnet.cjs`. Mainnet deployment is hard-locked to
chain `196` and the production token below, requires two explicit confirmation
guards, estimates every transaction with a gas buffer, journals partial progress
locally for safe resume, and writes the production manifest only after all
post-deployment invariants pass. Never commit private keys or the local journal.

```text
BANMAO: 0x16d91d1615fc55b76d5f92365bd60c069b46ef78
BanmaoBoxFactory constructor: (BanmaoBoxRenderer, previousFactory)
BanmaoBoxFactory.createTokenBox(BANMAO) # first deployment only; replacements inherit it
```

The frontend reads canonical per-chain addresses from versioned JSON manifests in
`deployments/`. Per-chain `NEXT_PUBLIC_BANMAO_*` variables are optional local
overrides only; never use an unscoped address fallback across chains.

Do not enable the public write interface until the deployed source has been
independently reviewed and the runtime bytecode, chain ID, Factory registry,
underlying token, immutable metadata renderer/admin, and active SVG renderer bytecode have been verified.

### X Layer mainnet release runbook

1. Freeze and independently review the exact Git commit. Run `npm ci`,
   `npm run generate:banmaobox`, `npm run generate:banmaobox:release`,
   `npm run test:contracts`, `npm run typecheck`, and the full application
   test/build checks. Commit and review the generated ABI plus
   `deployments/banmaobox-release-artifacts.json`; regeneration must produce no
   unexpected diff.
2. Put only server-side secrets/settings in ignored `.env.deploy.local`:
   `DEPLOYER_PRIVATE_KEY`, optional `XLAYER_MAINNET_RPC_URL`,
   `BANMAOBOX_MAINNET_CONFIRM=DEPLOY_BANMAOBOX_XLAYER_196`, and optional
   `BANMAOBOX_DEPLOY_CONFIRMATIONS=2`. Use the approved deployment wallet and
   fund it with enough OKB for the printed buffered estimates.
3. From PowerShell, run
   `npm run deploy:banmaobox:mainnet -- --confirm-mainnet`. The script refuses
   any chain except `196`, never deploys `MockBanmao`, and only targets
   `0x16d91d1615fc55b76d5f92365bd60c069b46ef78`.
4. To replace an immutable collection with a new metadata release, additionally
   set `BANMAOBOX_REPLACE_CONFIRM=REPLACE_BANMAOBOX_XLAYER_196` and pass
   `--replace-deployment`. A metadata-only replacement verifies and reuses the
   unchanged Renderer from the current manifest, then deploys a fresh standalone
   Factory (`previousFactory = address(0)`) and calls `createTokenBox(BANMAO)` for
   a fresh Box. The Factory must be redeployed because its runtime embeds the Box
   creation bytecode. The prior manifest is archived only after the new deployment
   passes every invariant.
5. If RPC or wallet submission stops the sequence, rerun the exact same command,
   including replacement flags when applicable. The ignored
   `.banmaobox-mainnet-journal.json` resumes only contracts deployed from the same
   compiler-input fingerprint. Never delete a journal until its addresses and
   transactions have been inspected; blind redeployment can waste gas or create
   an untracked deployment.
6. After success, use a separate trusted RPC and run
   `npm run verify:banmaobox:mainnet`. The verifier recompiles the exact checkout,
   checks the compiler-input fingerprint, normalizes only compiler-declared
   immutable byte ranges, and compares every release runtime with its artifact
   and manifest. It then uses the configured server-side OKX credentials to
   submit and poll source verification through the same X Layer API used by the
   application. No deployer private key or transaction is used. Pass
   `-- --runtime-only` to skip only the Explorer API phase.
7. The API phase verifies Renderer with no arguments, Factory with the immutable
   Renderer and zero predecessor address, and the Factory-created Box with production BANMAO,
   immutable metadata Renderer, and Factory deployer/renderer admin. To retry
   only this phase, run `npm run publish:banmaobox:explorer`. Confirm all three
   contracts are indexed as verified.
8. A successfully validated deployment is immediately available to the frontend;
   there is no manual enable flag. The frontend still rejects a manifest when its
   deployment status, canonical addresses, registry links, immutables,
   BANMAO/release runtime presence, or production constants are invalid.

## Development

Install application dependencies with `npm ci`. BanmaoBox deployment,
ABI-generation and mainnet deploy/verification scripts are versioned for review;
other integration utilities remain local-only.

Foundry tests and independent contract review are still required before a
production mainnet deployment.
