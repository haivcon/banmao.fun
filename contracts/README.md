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
- A creator may call `createBox(recipient, amount, lockDurationSec)` for a primary-token-only NFT, or `createMultiTokenBox(recipient, tokens, amounts, lockDurationSec)` for a basket of 2–5 distinct ERC-20s.
- Every basket's first asset must be the collection's primary token. This preserves canonical discovery and primary-token accounting while allowing up to four additional assets.
- Deposits are exact-balance checked independently for every asset. Releases require the collection balance to decrease by the recorded amount, while `BoxAssetReleased.amountReceived` records the owner's net receipt for fee-charging tokens. The collection exposes remaining contents through `getBoxAssets(tokenId)`.
- After `unlockTime`, the owner or an approved ERC-721 operator may call `openBox(tokenId)`. Every transferable asset is paid to the current NFT owner; an asset that fails remains in the live NFT and can be retried without rolling back successful releases.
- The NFT burns and its `boxDetails` are deleted only after the final remaining asset is released; historical data remains available through `BoxOpened` and per-asset events.
- Metadata includes the snapshotted token symbol, underlying token contract address, creator wallet, and UTC start/unlock dates. The creator is permanently captured from `msg.sender` at mint and does not change when the NFT is transferred. Symbol display is sanitized and never controls custody.
- There is no admin withdrawal, early unlock, renderer update, or collection upgrade path.
- Deposits reject transfer discrepancies. Payout requires the collection's balance to decrease by the exact recorded amount; the owner's net increase may be lower for an outbound fee token and is emitted as `amountReceived`.

Security and integration assumptions:

- Rebasing, blacklistable, pausable, fee-changing, or upgradeable ERC-20s can change behavior after deposit. A failing asset remains claimable for later retries, while unrelated assets are released independently. BanmaoBox cannot bypass token-level rules and intentionally has no privileged rescue path.
- `decimals()` must succeed and return at most 69. `symbol()` is optional for display: invalid, unsafe, or overlong values fall back to `TOKEN`.
- `ERC721Enumerable` enables bounded `getBoxesByOwner(owner, offset, limit)` reads but adds storage gas to mint, transfer, and burn.
- The renderer is immutable and must advertise `IBanmaoBoxRenderer` through ERC-165. Renderer or storage-layout changes require deploying a new renderer, factory, and token collection; existing deployed NFTs cannot be upgraded in place.
- Multi-token support adds `assetCount` to the renderer payload and therefore changes the renderer ERC-165 interface ID. Pre-basket renderer/factory/collection deployments are intentionally incompatible and must not be mixed with this release.
- `unlockTime` is stored as `uint64`; lock duration is capped at ten years.

Deployment order:

1. Compile with optimizer enabled (`runs: 200`) and the Shanghai EVM target.
2. For testnet only, deploy `MockBanmao` from `contracts/banmaobox/MockBanmao.sol`.
3. Deploy `BanmaoBoxRenderer` (no constructor arguments).
4. Deploy `BanmaoBoxFactory(rendererAddress)`.
5. Call `createTokenBox(tokenAddress)` for each desired token, or let any community member do so permissionlessly.
6. Read `boxForToken(tokenAddress)` and verify all source and addresses on X Layer Explorer.

X Layer testnet deployment tooling is maintained locally and is not distributed
in this repository. Deployment records remain versioned in
`deployments/banmaobox-xlayer-testnet.json`. Use a dedicated testnet wallet,
independently verify all address links and transaction hashes, and never commit
private keys.

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

## Development

Install application dependencies with `npm ci`. BanmaoBox deployment,
ABI-generation, and integration-test scripts are local-only and are not
distributed in this repository.

Foundry tests and independent contract review are still required before a
production mainnet deployment.
