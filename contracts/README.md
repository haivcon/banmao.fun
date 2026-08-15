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

- Anyone may call `BanmaoBoxFactory.createTokenBox(token)` to deploy the canonical collection for an ERC-20. Each token can have only one collection in a factory.
- Collections are full, non-proxy deployments permanently bound to one **primary** token and one renderer. The factory has no owner, upgrade, withdrawal, pause, or custody capability.
- A creator may call `createBox(recipient, amount, lockDurationSec)` for one primary-token-only NFT, `createBoxes(recipients, amounts, lockDurationSec)` for 1–20 primary-token NFTs sharing one duration, or `createMultiTokenBox(recipient, tokens, amounts, lockDurationSec)` for a basket of 2–5 distinct ERC-20s.
- Batch creation validates every row, pulls the aggregate primary-token amount once, and safely mints consecutive token IDs atomically. A failed ERC-20 transfer or ERC-721 receiver callback rolls back the entire batch.
- Locks must be greater than zero and may be at most `100 * 365 days` (36,500 days). There is no early unlock or privileged recovery path, so integrations should require explicit duration review before submission.
- Every basket's first asset must be the collection's primary token. This preserves canonical discovery and primary-token accounting while allowing up to four additional assets.
- Deposits and releases are exact-balance checked independently for every asset. A release succeeds only when the collection balance decreases and the owner's balance increases by the full recorded amount. Tokens that begin charging an outbound fee remain in the live NFT for retry instead of silently reducing its liability. The collection exposes remaining contents through `getBoxAssets(tokenId)`.
- After `unlockTime`, the owner or an approved ERC-721 operator may call `openBox(tokenId)`. Every transferable asset is paid to the current NFT owner; an asset that fails remains in the live NFT and can be retried without rolling back successful releases. Each batch payout has a 500,000 gas cap and copies at most 256 bytes of failure data so a hostile token cannot consume the entire basket operation with unbounded returndata.
- `openAsset(tokenId, assetIndex)` releases one selected asset and is the recovery path when another basket token is paused, blocked, or gas-griefing. Successful removal uses swap-and-pop, so integrations must reload `getBoxAssets(tokenId)` after each release instead of caching indices.
- The NFT is locked against transfer and burn while a payout is executing, preventing token callbacks from changing ownership mid-release. The NFT burns and its `boxDetails` are deleted only after the final remaining asset is released; historical data remains available through `BoxOpened` and per-asset events.
- Metadata includes the snapshotted token symbol, underlying token contract address, creator wallet, and UTC start/unlock dates. The creator is permanently captured from `msg.sender` at mint and does not change when the NFT is transferred. Symbol display is sanitized and never controls custody.
- There is no admin withdrawal, early unlock, renderer update, or collection upgrade path.
- Deposits and payouts reject transfer discrepancies. A payout requires both the collection's decrease and the owner's net increase to equal the exact recorded amount; otherwise the asset remains locked and retryable.

Security and integration assumptions:

- Rebasing, blacklistable, pausable, fee-changing, or upgradeable ERC-20s can change behavior after deposit. A failing asset remains claimable for later retries, while unrelated assets are released independently. If every batch attempt fails, `openBox` preserves the failure events and leaves the NFT and accounting unchanged; use `openAsset` for an isolated retry when appropriate. BanmaoBox cannot bypass token-level rules and intentionally has no privileged rescue path.
- `decimals()` must succeed and return at most 69. `symbol()` is optional for display: invalid, unsafe, or overlong values fall back to `TOKEN`.
- `ERC721Enumerable` enables bounded `getBoxesByOwner(owner, offset, limit)` reads but adds storage gas to mint, transfer, and burn.
- The renderer is immutable and must advertise `IBanmaoBoxRenderer` through ERC-165. Renderer or storage-layout changes require deploying a new renderer, factory, and token collection; existing deployed NFTs cannot be upgraded in place.
- Multi-token support adds `assetCount` to the renderer payload and therefore changes the renderer ERC-165 interface ID. Pre-basket renderer/factory/collection deployments are intentionally incompatible and must not be mixed with this release.
- `unlockTime` is stored as `uint64`; lock duration is capped at exactly `100 * 365 days` (36,500 days).

Deployment order:

1. Compile with optimizer enabled (`runs: 200`) and the Shanghai EVM target.
2. For testnet only, deploy `MockBanmao` from `contracts/banmaobox/MockBanmao.sol`.
3. Deploy `BanmaoBoxRenderer` (no constructor arguments).
4. Deploy `BanmaoBoxFactory(rendererAddress)`.
5. Call `createTokenBox(tokenAddress)` for each desired token, or let any community member do so permissionlessly.
6. Read `boxForToken(tokenAddress)` and verify all source and addresses on X Layer Explorer.

X Layer release tooling is versioned as `scripts/deploy-banmaobox-mainnet.cjs`
and `scripts/verify-banmaobox-mainnet.cjs`. Mainnet deployment is hard-locked to
chain `196` and the production token below, requires two explicit confirmation
guards, estimates every transaction with a gas buffer, journals partial progress
locally for safe resume, and writes the production manifest only after all
post-deployment invariants pass. Never commit private keys or the local journal.

```text
BANMAO: 0x16d91d1615fc55b76d5f92365bd60c069b46ef78
BanmaoBoxFactory constructor: (BanmaoBoxRenderer)
BanmaoBoxFactory.createTokenBox(BANMAO)
```

The frontend reads canonical per-chain addresses from versioned JSON manifests in
`deployments/`. Per-chain `NEXT_PUBLIC_BANMAO_*` variables are optional local
overrides only; never use an unscoped address fallback across chains.

Do not enable the public write interface until the deployed source has been
independently reviewed and the runtime bytecode, chain ID, Factory registry,
underlying token, and renderer invariants have been verified.

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
4. If RPC or wallet submission stops the sequence, rerun the same command. The
   ignored `.banmaobox-mainnet-journal.json` resumes confirmed Renderer/Factory/
   Box work only after each runtime matches the committed compiler artifact
   fingerprint. Never delete a journal until its addresses and transactions have
   been inspected; blind redeployment can create a second factory universe.
5. After success, use a separate trusted RPC and run
   `npm run verify:banmaobox:mainnet`. The verifier recompiles the exact checkout,
   checks the compiler-input fingerprint, normalizes only compiler-declared
   immutable byte ranges, and compares every release runtime with its artifact
   as well as the exact hashes in the manifest. Review the resulting chain,
   links, constants, current state, runtime byte lengths, and hashes. This command
   is read-only and uses no private key.
6. Verify all three contracts on X Layer Explorer with the exact compiler shown
   in the manifest, optimizer runs `200`, EVM `shanghai`, and constructor args:
   none for Renderer, ABI-encoded Renderer address for Factory, and ABI-encoded
   production BANMAO plus Renderer for the Factory-created Box. Confirm the
   explorer's runtime bytecode matches each manifest hash.
7. The deploy script deliberately writes `frontendEnabled: false`. After an
   independent reviewer confirms all checks, set it to `true` in the reviewed
   manifest commit and only then update/deploy the frontend. The frontend consumes
   that manifest and remains fail-closed while any address, registry link,
   immutable, BANMAO/release runtime
   presence, or production constant is invalid.

## Development

Install application dependencies with `npm ci`. BanmaoBox deployment,
ABI-generation and mainnet deploy/verification scripts are versioned for review;
other integration utilities remain local-only.

Foundry tests and independent contract review are still required before a
production mainnet deployment.
