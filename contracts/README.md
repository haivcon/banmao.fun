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
- Collections are full, non-proxy deployments permanently bound to one token and one renderer. The factory has no owner, upgrade, withdrawal, pause, or custody capability.
- A creator approves that token and calls `createBox(recipient, amount, lockDurationSec)` on its collection.
- The collection locks the exact amount and mints a transferable ERC-721 (`BMAO-BOX`).
- After `unlockTime`, the owner or an approved ERC-721 operator may call `openBox(tokenId)`, but payment always goes to the current NFT owner.
- Opening burns the NFT and deletes its `boxDetails`; historical data remains available through `BoxOpened` events.
- Metadata includes the snapshotted token symbol and, critically, the underlying token contract address. Symbol display is sanitized and never controls custody.
- There is no admin withdrawal, early unlock, renderer update, or collection upgrade path.
- Deposits reject transfer discrepancies. Payout requires both the collection's balance to decrease and the owner's balance to increase by the exact recorded amount. Fee-on-transfer payouts therefore revert atomically and leave the box intact.

Security and integration assumptions:

- Rebasing, blacklistable, pausable, fee-changing, or upgradeable ERC-20s can change behavior after deposit and permanently prevent opening. BanmaoBox cannot bypass token-level rules, and intentionally has no privileged rescue path.
- `decimals()` must succeed and return at most 69. `symbol()` is optional for display: invalid, unsafe, or overlong values fall back to `TOKEN`.
- `ERC721Enumerable` enables bounded `getBoxesByOwner(owner, offset, limit)` reads but adds storage gas to mint, transfer, and burn.
- The renderer is immutable and must advertise `IBanmaoBoxRenderer` through ERC-165.
- `unlockTime` is stored as `uint64`; lock duration is capped at ten years.

Deployment order:

1. Compile with optimizer enabled (`runs: 200`) and the Shanghai EVM target.
2. For testnet only, deploy `MockBanmao` from `contracts/banmaobox/MockBanmao.sol`.
3. Deploy `BanmaoBoxRenderer` (no constructor arguments).
4. Deploy `BanmaoBoxFactory(rendererAddress)`.
5. Call `createTokenBox(tokenAddress)` for each desired token, or let any community member do so permissionlessly.
6. Read `boxForToken(tokenAddress)` and verify all source and addresses on X Layer Explorer.

X Layer testnet deployment (chain ID `1952`):

```powershell
Copy-Item .env.deploy.example .env.deploy.local
# Add a dedicated testnet wallet private key to .env.deploy.local, fund it with testnet OKB, then:
npm run deploy:banmaobox:xlayer-testnet
```

The script deploys `MockBanmao`, the renderer, and the factory, then creates the
canonical MockBanmao collection through the factory. It validates all address
links and writes transaction hashes to
`deployments/banmaobox-xlayer-testnet.json`. If an interrupted run already
created the mock token, set `EXISTING_MOCK_BANMAO_ADDRESS` (and optionally
`EXISTING_MOCK_BANMAO_TX_HASH`) to resume without deploying it again. Never
commit private keys.

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

The repository uses npm, solc-js, and a local JSON-RPC EVM for its current
integration suite:

```bash
npm ci
npm run generate:banmaobox
# Start Anvil or another compatible local EVM on 127.0.0.1:8545, then:
npm run test:banmaobox
```

Foundry tests and independent contract review are still required before a
production mainnet deployment.
