# BanmaoKing release and deployment

These scripts do not enable frontend minting. Contracts remain immutable and mint is publicly callable immediately after NFT deployment, regardless of the frontend toggle. No opening time, allowlist or per-wallet cap exists. Confirm this launch policy before broadcasting.

## Deployed mainnet contracts (active frontend release)

Network: **X Layer mainnet, chain ID 196**. The addresses below are recorded in the local `banmaoking-xlayer-mainnet-release` manifest and explorer verification journal; all seven entries are recorded as `verified`. This is the release used by the frontend, not the older deployment directory. These records are not a fresh live-chain check or a security audit.

| Contract | Role | Explorer |
| --- | --- | --- |
| BanmaoKingNFT | Collection, mint and `refreshMetadata(tokenId)` | [0xEcA5897DE2944ADa9b1048ECFBB8391261422957](https://www.oklink.com/xlayer/address/0xEcA5897DE2944ADa9b1048ECFBB8391261422957) |
| BanmaoKingRenderer | On-chain SVG and metadata renderer | [0xC7cA38752E04e2C803d08A5c2Addc3D375D0123d](https://www.oklink.com/xlayer/address/0xC7cA38752E04e2C803d08A5c2Addc3D375D0123d) |
| BanmaoKingBodyLib | Body artwork library | [0xF09Ad20201420B085DDFaF4F4A8d9292153eA54F](https://www.oklink.com/xlayer/address/0xF09Ad20201420B085DDFaF4F4A8d9292153eA54F) |
| BanmaoKingExpressionLib | Expression artwork library | [0x2475effeCd8880842a53F7928Bf4d03E809B6B52](https://www.oklink.com/xlayer/address/0x2475effeCd8880842a53F7928Bf4d03E809B6B52) |
| BanmaoKingAccessoryLib | Accessory artwork library | [0x7eD30A39CeDAA267198512B8326b7a8Ec425271d](https://www.oklink.com/xlayer/address/0x7eD30A39CeDAA267198512B8326b7a8Ec425271d) |
| BanmaoKingMotionPart0 | Motion renderer part 0, created by Renderer | [0x06b6f86dafa444Fe7A31bf201F6d9DB6aE197DEE](https://www.oklink.com/xlayer/address/0x06b6f86dafa444Fe7A31bf201F6d9DB6aE197DEE) |
| BanmaoKingMotionPart1 | Motion renderer part 1, created by Renderer | [0xfA7D2868B672C015741E894B5CE5D5Fc1c17706D](https://www.oklink.com/xlayer/address/0xfA7D2868B672C015741E894B5CE5D5Fc1c17706D) |

Existing payment token (not deployed as part of this release): [BANMAO — 0x16d91d1615fC55b76d5F92365BD60C069b46eF78](https://www.oklink.com/xlayer/address/0x16d91d1615fC55b76d5F92365BD60C069b46eF78).

Mint price: **6,666 BANMAO**; maximum supply: **9,216**; royalty: **2%**; native mint disabled. OKB pays network gas. Metadata refresh is a separate wallet-signed transaction and does not guarantee animated marketplace thumbnails.

Release compiler input hash: `0x0ac9ecab40e3714fe5d2679d02539d546a5377ac3bed8464d13c915f7da1ef97`.

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
| nativePrice | Decimal STRING in native base units; `"0"` disables native minting (not free minting) and requires at least one ERC20 payment token |
| payments | Explicit array of `{ "token": address, "price": positiveBaseUnitString }`, or `[]` |
| royaltyReceiver | Nonzero address |
| royaltyBps | Integer 0..10000; choose deliberately, royalties are not enforced payments |
| collectionSeed | 0x-prefixed 32-byte value; public deterministic seed, NOT fair randomness |

Native and ERC20 prices are permanent and independent. Buyers can choose the cheapest accepted route. Do not accept upgradeable, rebasing, fee-bearing or untrusted payment tokens without accepting their risks. A balance-delta check is not a complete economic audit. Treasury ERC20 self-payment normally fails because its net balance does not increase. A rejecting treasury blocks native mints; no treasury replacement exists.

## Broadcast (manual, after testnet acceptance)

Set `BANMAOKING_RPC_URL`, `DEPLOYER_PRIVATE_KEY` and `BANMAOKING_DEPLOY_CONFIRM`. Like the BanmaoBox publisher, scripts load Next environment files and `.env.deploy.local` without overriding existing environment values. Never commit secrets. Confirmation must equal `DEPLOY_BANMAOKING_1952` or `DEPLOY_BANMAOKING_196` matching the config.

Mainnet automatically runs RPC verification and publishes all seven contracts to OKX Explorer after deployment. Configure `OKX_API_KEY`, `OKX_SECRET_KEY`, and `OKX_PASSPHRASE` (or `OKX_API_PASSPHRASE`); complete numbered triplets `_1` through `_20` are also supported, as in BanmaoBox. Optional: `OKX_PROJECT_ID`. Missing credentials stop the default broadcast before any transaction. Credential presence does not guarantee API authorization.

For testnet use `--broadcast --skip-explorer`: the shared OKX endpoint is mainnet-only. Mainnet can also explicitly use `--skip-explorer` when publication must be deferred. RPC/runtime verification still runs. Neither case claims explorer verification.

```powershell
node scripts/deploy-banmaoking.cjs C:\secure\king-config.json C:\secure\king-release --broadcast
node scripts/verify-banmaoking.cjs C:\secure\king-release
```

Use a fresh output directory with an existing parent. The script refuses any existing output directory. It writes release sources, exact compiler version, compiler input hash, constructor arguments, expected addresses and transaction hashes. A transaction identity is persisted BEFORE broadcasting. If interrupted, inspect the recorded transaction on-chain. Do not delete the journal or rerun into another directory blindly: deployment might already have succeeded. Automatic resume/replacement is intentionally not implemented.

Deploy order: Body, Expression, Accessory, Renderer (creates two Motion contracts), NFT. Runtime is checked against compiler artifacts with immutable slots normalized. The read-only verifier separately validates deployment transaction data, configured getters, payment prices, royalties, layer pointers, both Motion runtimes and sample metadata. It does not mint, transfer or approve tokens.

## Explorer verification

`release.json.input` is the complete Solidity Standard JSON compiler input, including dependencies. Use the exact `compilerVersion`, fully qualified source/contract name from `release.json.artifacts`, and ABI-encoded constructor arguments from `manifest.json.contracts` when publishing to the target explorer. Motion contracts have no constructor arguments and their addresses are available from Renderer getters.

`verify-banmaoking.cjs OUTPUT_DIRECTORY` first performs local/RPC verification, then automatically publishes source to the same mainnet OKX API used by BanmaoBox. It needs RPC and API credentials, but no deployer private key. Use `--skip-explorer` for read-only RPC checks.

Publication uses the archived Standard JSON input, exact compiler version and constructor arguments. It discovers both Motion addresses through verified renderer getters. Each submitted GUID is saved to `explorer-verification.json`; rerunning polls saved GUIDs and skips addresses already verified by the explorer. Explicit failures may be resubmitted; timeout/pending jobs retain their GUID. Polling allows five minutes per target, at 15-second intervals. The shared HTTP request timeout uses `BANMAOBOX_PUBLISH_REQUEST_TIMEOUT_MS` (default 20000).

If verification fails after deployment, the command exits nonzero but the contracts remain deployed. Do NOT rerun deployment or delete the release directory. Rerun only `verify-banmaoking.cjs` with the same directory. API submission and local journal writes are not atomic; after a crash before a GUID is saved, a retry may submit verification again, but never deploys contracts. A GUID submission alone is not success: the script requires a passing result and an indexed explorer record.

Offline publisher tests: `node --test scripts/banmaoking-tooling.test.cjs scripts/banmaoking-explorer.test.cjs`. These use mocked explorer responses and do not establish live API availability.

## Required acceptance gates

- Complete security suite passes, including exhaustion of all 9216 combinations.
- Testnet deployment, native/ERC20 mint with actual configured tokens, safe transfer, receiver rollback, metadata retrieval and marketplace rendering succeed.
- Measure RPC tokenURI gas/response limits; view calls can fail under RPC limits despite being free to the caller.
- Review treasury, royalty, decimals, prices, seed and supply with two people. ERC165 checks only attest interface claims; they do not prove dependency integrity.
- Archive release/manifest and publish explorer verification for all seven contracts.
- Wire and test frontend mint transactions; do not assume changing the preview toggle alone implements minting.
- Only then decide on mainnet broadcast. No mainnet readiness guarantee follows solely from compile or unit tests.

No MetadataUpdate event is required merely for minting immutable metadata under ERC-4906. Minting does not emit this event.

Anyone can submit `refreshMetadata(tokenId)` for an existing token to emit `MetadataUpdate(tokenId)` as a cache-refresh hint. The transaction costs gas, accepts no native value, and reverts for nonexistent tokens. It does not change the renderer, SVG, traits, ownership or funds. Indexers may react by fetching `tokenURI(tokenId)` again; marketplace support and refresh timing are not guaranteed. To read the current on-chain metadata directly, call `tokenURI(tokenId)` (or `renderSVG(tokenId)` for the SVG) without a refresh transaction.

This entry point only exists in releases compiled with the updated NFT source. Previously deployed immutable NFT contracts cannot acquire it through an upgrade; retain their original release artifacts.
