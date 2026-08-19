# Smart Contracts

This directory contains Solidity smart contracts for the Banmao ecosystem.

## Contracts

### `BanMaoSnake/BanMaoSnake.sol`
Snake game reward distribution contract with:
- EIP-712 signature verification
- Daily per-player caps (5000 tokens)
- Hourly system-wide caps (50000 tokens)
- Minimum claim threshold (100 tokens)

### `BanmaoBox/` — BanmaoBox system

A permissionless system for transferable, time-locked ERC-20 gift boxes:

- Anyone may call `BanmaoBoxFactory.createTokenBox(token)` to deploy the canonical collection for an ERC-20. Each token can have only one collection across the Factory's full `previousFactory` registry chain.
- A replacement Factory keeps its predecessor registry discoverable through `boxForToken(token)` and `isTokenBox(box)`. The fallback is read-only: predecessor entries are not copied into the replacement Factory's storage.
- Collections are full, non-proxy deployments permanently bound to one **primary** token. The Factory deployer is the immutable renderer admin for every collection. It may update the Factory's `defaultRenderer` for subsequently created collections and replace an existing collection's full metadata renderer; it has no token upgrade, withdrawal, pause, or custody authority.
- Deployment manifests keep renderer roles explicit: `factoryRenderer` is immutable constructor provenance, `defaultRenderer` is the Factory's current default for future collections, and `boxRenderer` is the canonical Box's current active renderer. Factory/Box source verification must continue to use `factoryRenderer` as the constructor argument even after either mutable renderer changes.
- A creator may call `createBox(recipient, amount, lockDurationSec)` for one primary-token-only NFT, `createBoxes(recipients, amounts, lockDurationSec)` for 1–20 primary-token NFTs sharing one duration, or `createMultiTokenBox(recipient, tokens, amounts, lockDurationSec)` for a basket of 2–5 distinct ERC-20s.
- Batch creation validates every row, pulls the aggregate primary-token amount once, and safely mints consecutive token IDs atomically. A failed ERC-20 transfer or ERC-721 receiver callback rolls back the entire batch.
- Successful mints emit ERC-721 `Transfer` followed immediately by exactly one ERC-4906 `MetadataUpdate(tokenId)` on every mint path; batches emit one pair per minted token. `refreshMetadata(tokenId)` remains a permissionless manual retry for every live box and changes no custody or box state; frontends do not need to submit it automatically after mint.
- Locks must be greater than zero and may be at most `100 * 365 days` (36,500 days, slightly less than 100 Gregorian years because leap days are not included). There is no early unlock or privileged recovery path, so integrations should require explicit duration review before submission.
- Every basket's first asset must be the collection's primary token. This preserves canonical discovery and primary-token accounting while allowing up to four additional assets.
- Deposits and releases are exact-balance checked independently for every asset. A release succeeds only when the collection balance decreases and the owner's balance increases by the full recorded amount. Tokens that begin charging an outbound fee remain in the live NFT for retry instead of silently reducing its liability. The collection exposes remaining contents through `getBoxAssets(tokenId)`.
- After `unlockTime`, the owner or an approved ERC-721 operator may call `openBox(tokenId)`. Every transferable asset is paid to the current NFT owner; an asset that fails remains in the live NFT and can be retried without rolling back successful releases. Each batch payout has a 500,000 gas cap and copies at most 256 bytes of failure data so a hostile token cannot consume the entire basket operation with unbounded returndata.
- `openAsset(tokenId, assetIndex)` releases one selected asset and is the recovery path when another basket token is paused, blocked, or gas-griefing. The owner or an approved ERC-721 operator may release, but only the current NFT owner—not an approved address or operator—may call `abandonAsset(tokenId, assetIndex)`. Abandonment detaches a stuck asset without attempting a transfer and records the amount in `recoverableAbandoned(owner, token)` while `totalLockedByToken` continues to include that claim. The same owner can use `claimAbandonedAsset(token)` as a last-resort payout: the collection must lose the full recorded amount, but an outbound fee is accepted if the owner receives a positive amount. `AbandonedAssetClaimed` reports both the liability settled and the amount actually received. Both removal paths use swap-and-pop. Integrations should use the guarded four-argument overloads `openAsset(tokenId, assetIndex, expectedToken, expectedAmount)` and `abandonAsset(tokenId, assetIndex, expectedToken, expectedAmount)`, which revert with `AssetStateMismatch` if a cached index now identifies another asset.
- The NFT is locked against transfer and burn while a payout is executing, preventing token callbacks from changing ownership mid-release. The NFT burns and its `boxDetails` are deleted only after the final remaining asset is released or moved into its owner's recoverable claim. Releasing or abandoning the primary asset immediately clears `boxDetails[tokenId].amount`. `BoxOpened.amount` reports primary tokens paid in the transaction that emptied the box, so it is zero when the primary asset was released earlier or abandoned; historical release, abandonment, and claim data remains available through events.
- ERC-20 transfers sent directly to a collection cannot be attributed safely because standard ERC-20 transfers provide no receiver callback or authenticated sender record to the recipient contract. `untrackedSurplus(token)` exposes balances above all live-box and recoverable-claim liabilities, but the immutable no-admin design deliberately provides no sweep authority that could seize an accidental transfer.
- The full renderer supplies `tokenURI`, SVG, and attributes from bounded `BanmaoBoxRenderData`. The bundled renderer uses one temporally stable neutral `Status = Sealed` and neutral `SEALED` SVG wording for every extant NFT while retaining factual created time, unlock time, and duration. Unlock enforcement remains exclusively in `BanmaoBox.openBox`/asset release paths. The creator is permanently captured from `msg.sender`; symbol display is sanitized and never controls custody. The read-only HTTPS metadata proxy remains optional.
- There is no admin withdrawal, early unlock, or collection upgrade path. Renderer replacement can change or break metadata, but cannot transfer, approve, mint, burn, release, or otherwise control locked assets.
- Deposits and payouts reject transfer discrepancies. A payout requires both the collection's decrease and the owner's net increase to equal the exact recorded amount; otherwise the asset remains locked and retryable.

Security and integration assumptions:

- Rebasing, blacklistable, pausable, fee-changing, or upgradeable ERC-20s can change behavior after deposit. A failing asset remains claimable for later retries, while unrelated assets are released independently. If every batch attempt fails, `openBox` preserves the failure events and leaves the NFT and accounting unchanged; use `openAsset` for an isolated retry when appropriate. BanmaoBox cannot bypass token-level rules and intentionally has no privileged rescue path.
- `decimals()` must succeed and return at most 69. `symbol()` is optional for display: invalid, unsafe, or overlong values fall back to `TOKEN`.
- `ERC721Enumerable` enables bounded `getBoxesByOwner(owner, offset, limit)` reads but adds storage gas to mint, transfer, and burn.
- The Factory and collection require proper ERC-165 support for both the full `IBanmaoBoxRenderer` interface and its inherited `IBanmaoBoxSVGRenderer` capability. The Factory deployer may call `setDefaultRenderer(newRenderer)` to affect only future collections; the immutable Factory `renderer` field remains deployment provenance. The same admin may call `BanmaoBox.setRenderer(newRenderer)`, changing `tokenURI`, `renderSVG`, and `renderAttributes` together and emitting `RendererUpdated` plus ERC-4906 `BatchMetadataUpdate`. The renderer receives calldata only and the Box never grants it approvals or calls it from custody paths.
- Multi-token support adds `assetCount` to the renderer payload and therefore changes the renderer ERC-165 interface ID. Earlier deployments are audit history only and are intentionally unsupported by current source, ABI, frontend, verifier, and deployment workflow.
- Factory runtime includes the `BanmaoBox` creation bytecode used by `createTokenBox`, so any Box bytecode change also changes the Factory artifact even when `BanmaoBoxFactory.sol` itself is unchanged.
- `unlockTime` is stored as `uint64`; lock duration is capped at exactly `100 * 365 days` (36,500 days).

Deployment order:

1. Compile with optimizer enabled (`runs: 200`) and the Shanghai EVM target.
2. For testnet only, deploy `MockBanmao` from `contracts/BanmaoBox/Mock/MockBanmao.sol`.
3. Deploy a new `BanmaoBoxRenderer` (no constructor arguments).
4. Deploy `BanmaoBoxFactory(rendererAddress, previousFactoryAddress)`. Use the zero address for the first Factory and the current Factory address for a registry-preserving replacement.
5. Call `createTokenBox(tokenAddress)` for each token not already present anywhere in the predecessor chain, or let any community member do so permissionlessly.
6. Read `boxForToken(tokenAddress)` and verify all source and addresses on X Layer Explorer.

The repository compiler reads the physical `contracts/BanmaoBox/{Box,Factory,Renderer,Mock}/`
layout through `scripts/banmaobox-runtime.cjs`. Standard JSON source keys and Explorer
contract names intentionally retain the deployed legacy `contracts/banmaobox/*.sol`
identities; they are virtual provenance names, not current physical paths.

X Layer release tooling is versioned as `scripts/deploy-banmaobox-mainnet.cjs`
and `scripts/verify-banmaobox-mainnet.cjs`. Mainnet deployment is hard-locked to
chain `196` and the production token below, requires two explicit confirmation
guards, estimates every transaction with a gas buffer, journals partial progress
locally for safe resume, and writes the production manifest only after all
post-deployment invariants pass. Never commit private keys or the local journal.

The canonical release is the full-renderer architecture only. Earlier split-renderer
deployments and their manifests are immutable audit history; current source, generated
ABI, frontend, verifier, and deployment workflow do not support them.

The active mainnet manifest describes the verified full-renderer deployment: a standalone
Factory (`previousFactory = address(0)`), its Renderer, and the canonical BANMAO Box. The
previous deployment remains archived for auditability.

```text
BANMAO: 0x16d91d1615fc55b76d5f92365bd60c069b46ef78
BanmaoBoxFactory constructor: (BanmaoBoxRenderer, previousFactory)
BanmaoBoxFactory.createTokenBox(BANMAO)
```

The frontend reads canonical per-chain addresses from versioned JSON manifests in
`deployments/`. Per-chain `NEXT_PUBLIC_BANMAO_*` variables are optional local
overrides only; never use an unscoped address fallback across chains.

The active X Layer mainnet manifest points to the verified full-renderer collection:
Renderer `0x479365c028A1FA633b16BBef95e8691D4f37B21F`, standalone Factory
`0x01E03F6eb085f4934A3A7946545b00341B95d9E9`, and BanmaoBox
`0xE8247C96787119A8F7E8F8C81F58BeC5BEFC999f`. Previous deployment records remain
archived under `deployments/banmaobox-mainnet-history/` for auditability.

The collection and Factory were not redeployed for the Unicode metadata update. The
replacement Renderer was deployed in transaction
`0x246558f6c8815e9f165de9d0795e0080d6c56aa5d8098ce577feaa3be922909b`, then the
existing collection selected it in transaction
`0x93d9de7c37cfb520bcaf5c8fae9a0a8d4f97e6db7456ca185d607e4a0b04ebb0`.

Do not enable the public write interface until the deployed source has been
independently reviewed and the runtime bytecode, chain ID, Factory registry,
underlying token, renderer admin, and architecture-appropriate renderer links and bytecode have been verified.

Each BanmaoBox collection is a direct, immutable Factory deployment, not a proxy.
Automatic source publication therefore uses only `verify-contract-info`,
`verify-source-code`, and `check-verify-result`. The OKX
`verify-proxy-contract` and `check-proxy-verify-result` APIs are inapplicable and
must never be called for BanmaoBox collections.

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
4. To replace the currently deployed collection with another full-renderer release in the future, additionally
   set `BANMAOBOX_REPLACE_CONFIRM=REPLACE_BANMAOBOX_XLAYER_196` and pass
   `--replace-deployment`. The migration revalidates and reuses the current full Renderer, then deploys a fresh standalone
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
   initial full Renderer, and Factory deployer/renderer admin. To retry
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
