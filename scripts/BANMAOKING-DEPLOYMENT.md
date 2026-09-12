# BanmaoKing release and deployment

These scripts do not enable frontend minting. Contracts remain immutable and mint is publicly callable immediately after NFT deployment, regardless of the frontend toggle. No opening time, allowlist or per-wallet cap exists. Confirm this launch policy before broadcasting.

## Offline validation

Run from the project root:

```powershell
node scripts/banmaoking-release.cjs
node --test scripts/banmaoking-tooling.test.cjs
npx jest --runInBand --forceExit --testPathPatterns=banmaoKing
node scripts/deploy-banmaoking.cjs C:\secure\king-config.json C:\secure\king-release
```

The final command defaults to compile/configuration validation only. It does not contact RPC, estimate network gas, test treasury receipt, or validate token economics.

The config must contain all of these fields (no economic defaults):

| Field | Requirement |
| --- | --- |
| chainId | 1952 for X Layer testnet, 196 for mainnet; verify against current network documentation |
| treasury | Nonzero checksummed address capable of receiving native currency |
| maxSupply | Integer 1..9216 |
| nativePrice | Positive decimal STRING in native base units, not human OKB |
| payments | Explicit array of `{ "token": address, "price": positiveBaseUnitString }`, or `[]` |
| royaltyReceiver | Nonzero address |
| royaltyBps | Integer 0..10000; choose deliberately, royalties are not enforced payments |
| collectionSeed | 0x-prefixed 32-byte value; public deterministic seed, NOT fair randomness |

Native and ERC20 prices are permanent and independent. Buyers can choose the cheapest accepted route. Do not accept upgradeable, rebasing, fee-bearing or untrusted payment tokens without accepting their risks. A balance-delta check is not a complete economic audit. Treasury ERC20 self-payment normally fails because its net balance does not increase. A rejecting treasury blocks native mints; no treasury replacement exists.

## Broadcast (manual, after testnet acceptance)

Set `BANMAOKING_RPC_URL`, `DEPLOYER_PRIVATE_KEY` and `BANMAOKING_DEPLOY_CONFIRM` in the process environment. Scripts deliberately do not load private-key files automatically. Confirmation must equal `DEPLOY_BANMAOKING_1952` or `DEPLOY_BANMAOKING_196` matching the config.

```powershell
node scripts/deploy-banmaoking.cjs C:\secure\king-config.json C:\secure\king-release --broadcast
node scripts/verify-banmaoking.cjs C:\secure\king-release
```

Use a fresh output directory with an existing parent. The script refuses any existing output directory. It writes release sources, exact compiler version, compiler input hash, constructor arguments, expected addresses and transaction hashes. A transaction identity is persisted BEFORE broadcasting. If interrupted, inspect the recorded transaction on-chain. Do not delete the journal or rerun into another directory blindly: deployment might already have succeeded. Automatic resume/replacement is intentionally not implemented.

Deploy order: Body, Expression, Accessory, Renderer (creates two Motion contracts), NFT. Runtime is checked against compiler artifacts with immutable slots normalized. The read-only verifier separately validates deployment transaction data, configured getters, payment prices, royalties, layer pointers, both Motion runtimes and sample metadata. It does not mint, transfer or approve tokens.

## Explorer verification

`release.json.input` is the complete Solidity Standard JSON compiler input, including dependencies. Use the exact `compilerVersion`, fully qualified source/contract name from `release.json.artifacts`, and ABI-encoded constructor arguments from `manifest.json.contracts` when publishing to the target explorer. Motion contracts have no constructor arguments and their addresses are available from Renderer getters.

`verify-banmaoking.cjs` performs local/RPC verification, NOT explorer publication. An automatic explorer API publisher is not included because endpoint/API credentials must be confirmed first. Do not claim verified explorer source until the explorer confirms it.

## Required acceptance gates

- Complete security suite passes, including exhaustion of all 9216 combinations.
- Testnet deployment, native/ERC20 mint with actual configured tokens, safe transfer, receiver rollback, metadata retrieval and marketplace rendering succeed.
- Measure RPC tokenURI gas/response limits; view calls can fail under RPC limits despite being free to the caller.
- Review treasury, royalty, decimals, prices, seed and supply with two people. ERC165 checks only attest interface claims; they do not prove dependency integrity.
- Archive release/manifest and publish explorer verification for all seven contracts.
- Wire and test frontend mint transactions; do not assume changing the preview toggle alone implements minting.
- Only then decide on mainnet broadcast. No mainnet readiness guarantee follows solely from compile or unit tests.

No MetadataUpdate event is required merely for minting immutable metadata under ERC-4906. Do not add a misleading metadata-change event just to satisfy a checklist.
