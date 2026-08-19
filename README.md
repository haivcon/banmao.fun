# Banmao Fun

Community, DeFi, GameFi, and on-chain experiences for [X Layer](https://www.okx.com/xlayer), built with Next.js, TypeScript, React, and Solidity.

- Live application: [www.banmao.fun](https://www.banmao.fun/)
- Network: X Layer mainnet (`196`)
- License: [MIT](LICENSE)

> The source repository describes implemented capabilities. A route, flag, or deployment record does not prove that a feature is enabled in production. Verify the active network, configuration, and versioned deployment evidence before using a write path.

## What is included

- Responsive 2D/3D landing and community experiences
- Collection browsing, profiles, posts, social interactions, quests, and media workflows
- DeFi surfaces for staking, burn analytics, airdrop preparation, and BanmaoBox
- GameFi experiences including FOMO, Snake, Slots, RPS, and PK
- Feature-gated BANMAO AI with same-origin streaming chat, retrieval, read-only tools, and a transaction copilot that prepares/simulates drafts but never signs or submits them

Availability depends on network selection, verified contracts, server configuration, third-party services, and feature flags.

## Architecture

| Area | Technology / responsibility |
|---|---|
| Web application | Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4 |
| Wallet and chain | Wagmi, Viem, Ethers; X Layer mainnet chain ID `196` |
| Client state | TanStack Query and Zustand |
| Media and 3D | Cloudinary, Three.js, React Three Fiber, Drei, Framer Motion |
| Server routes | Next.js Route Handlers and libSQL-backed readers |
| Contracts | Solidity 0.8.30, OpenZeppelin, generated TypeScript ABIs |
| Quality | TypeScript, ESLint, Jest, GitHub Actions, gitleaks |
| Hosting | Vercel (deployment status remains independent from CI) |

```text
.github/       CI, ownership, dependency updates, and contribution templates
__tests__/     Jest-discovered TypeScript suites
app/           App Router pages, APIs, UI, DeFi, and GameFi surfaces
components/    Shared components
contracts/     Solidity source and contract documentation
deployments/   Chain manifests and immutable hash-versioned release evidence
docs/ai/       BANMAO AI architecture, privacy, operations, and rollout
lib/           Shared client/server libraries
scripts/       Audited BanmaoBox generation, verification, and maintainer tools
```

## X Layer contracts and BanmaoBox

The canonical X Layer mainnet manifest is [`deployments/banmaobox-xlayer-mainnet.json`](deployments/banmaobox-xlayer-mainnet.json). It distinguishes the immutable Factory-era renderer from the current renderer used for new and existing boxes.

| Contract | Address | Explorer |
|---|---|---|
| BANMAO token | `0x16d91d1615fC55b76d5F92365BD60C069b46eF78` | [View](https://web3.okx.com/explorer/x-layer/evm/address/0x16d91d1615fC55b76d5F92365BD60C069b46eF78) |
| BanmaoBox Factory | `0x01E03F6eb085f4934A3A7946545b00341B95d9E9` | [View](https://web3.okx.com/explorer/x-layer/evm/address/0x01E03F6eb085f4934A3A7946545b00341B95d9E9) |
| Current Renderer | `0x479365c028A1FA633b16BBef95e8691D4f37B21F` | [View](https://web3.okx.com/explorer/x-layer/evm/address/0x479365c028A1FA633b16BBef95e8691D4f37B21F) |
| Canonical BanmaoBox | `0xE8247C96787119A8F7E8F8C81F58BeC5BEFC999f` | [View](https://web3.okx.com/explorer/x-layer/evm/address/0xE8247C96787119A8F7E8F8C81F58BeC5BEFC999f) |
| Factory-era Renderer | `0xE19c875dBfa80171819E443e46Fc7839a9290769` | [View](https://web3.okx.com/explorer/x-layer/evm/address/0xE19c875dBfa80171819E443e46Fc7839a9290769) |

The current canonical Renderer runtime is 19,214 bytes with keccak256 `0xd69507283765b914480cf8aa8a8f37f4bbd351b0620ede3b0bbd5e3ca390f703`. The corresponding compiler-input release is stored immutably at [`deployments/banmaobox-releases/22aad5bfec33af537e970ff3f2cca2f43d7ebfe63d1c537712d9ecb8728ebc8d.json`](deployments/banmaobox-releases/22aad5bfec33af537e970ff3f2cca2f43d7ebfe63d1c537712d9ecb8728ebc8d.json).

BanmaoBox is non-custodial. Users sign transactions in their own wallets, and redemption does not depend on a backend custodian. A valid timelock has no maintainer bypass or early-unlock path. Third-party token behavior—including fees, pausing, blacklisting, rebasing, or upgrades—can still affect transfers. See [`contracts/README.md`](contracts/README.md).

## Prerequisites and setup

- Node.js version from [`.nvmrc`](.nvmrc) (currently Node 22)
- npm and the checked-in `package-lock.json`
- A browser wallet for wallet-connected features
- Optional service credentials only for the integrations you enable

```bash
git clone https://github.com/haivcon/banmao.fun.git
cd banmao.fun
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). All optional AI flags default to disabled. The Telegram companion integration is disabled with HTTP 503 unless its server-only API origin is configured.

## Environment configuration

[`.env.example`](.env.example) contains variable names, safe placeholders, purpose comments, and disabled defaults. Never copy a real environment file into the repository.

| Category | Examples | Exposure |
|---|---|---|
| Public chain/wallet settings | `NEXT_PUBLIC_XLAYER_*`, `NEXT_PUBLIC_WC_PROJECT_ID` | Browser-visible by design; never credentials |
| Server service integrations | `CLOUDINARY_URL`, `TELEGRAM_API_BASE_URL` | Server only |
| Shared persistence | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Server only |
| BANMAO AI | `AI_API_KEY`, feature flags, session/SIWE and budget settings | Server only |
| Chain readers | `XLAYER_RPC_URL` | Server only |
| Explorer verification | `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE`, `OKX_PROJECT_ID` | Server only |

No credential, private key, passphrase, or session secret may use a `NEXT_PUBLIC_` prefix. Use HTTPS service origins in shared environments. Deployment keys belong only in ignored maintainer-local configuration and are never required for development or CI.

## Commands and tests

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run lint` | Run ESLint |
| `npm test -- --runInBand` | Run all Jest-discovered tests serially |
| `npm run test:contracts` | Run the BanmaoBox contract/security suite |
| `npm run test:release` | Validate immutable BanmaoBox verification-release behavior |
| `npm run check:generated` | Regenerate canonical BanmaoBox outputs and reject drift/missing immutable evidence |
| `npm run check` | Run generated checks, typecheck, lint, and all Jest tests |

Jest discovers `__tests__/**/*.test.ts` through one configuration; there are no Jest projects and no `--selectProjects` workflow. Contract tests live under `__tests__/contracts/`, AI tests under `__tests__/ai/`, and the remaining application/integration suites preserve their current paths.

## Generated-artifact workflow

After an approved change to the physical sources under `contracts/BanmaoBox/`:

```bash
npm run generate:banmaobox
npm run generate:banmaobox:release
npm run check:generated
```

Commit these together when changed:

- `app/defi/box/generated/abis.ts`
- `deployments/banmaobox-release-artifacts.json`
- `lib/banmaobox/verification-release.json`
- the matching new hash-versioned file under `deployments/banmaobox-releases/`

Never overwrite or remove historical releases, deployment manifests, or deployment records. Generation is local and deterministic; deploy, publish, and Explorer verification commands are maintainer-only operations and are not run by CI.

BanmaoBox compilation preserves the legacy virtual Standard JSON and Explorer names
under `contracts/banmaobox/`; those names are provenance identifiers, not physical paths.

## Security model

- Wallets retain signing authority; the application must not request seed phrases or private keys.
- Server credentials remain server-only and are redacted from errors and logs.
- BANMAO AI tools are allowlisted and read-only unless a user explicitly reviews a bounded transaction draft; the copilot never signs or submits it.
- Web3 writes require the intended chain and validated deployment/runtime relationships.
- Feature flags and external services fail closed when required configuration is absent.
- Production dependency auditing and full-history gitleaks scanning run independently from Vercel deployment status.

Report vulnerabilities only through a [private GitHub Security Advisory](https://github.com/haivcon/banmao.fun/security/advisories/new); see [SECURITY.md](SECURITY.md). Do not publish exploit details in an issue.

## Contributing and support

Read [CONTRIBUTING.md](CONTRIBUTING.md), follow the [Code of Conduct](CODE_OF_CONDUCT.md), and use the issue templates for bugs, features, or configuration questions. See [SUPPORT.md](SUPPORT.md) for safe support channels.

CI checks generated artifacts, TypeScript, ESLint, Jest, critical production dependency advisories, and Git history for secrets. Do not infer green CI from this document; use the status on the exact commit or pull request.

## Deployment policy

Vercel status is separate from GitHub CI. Pushes may be handled by the connected Vercel project, but contributors must not trigger deploy/publish scripts or edit production infrastructure as part of a normal change. Environment values are managed in the hosting platform, never committed. Contract deployment, Explorer submission, release replacement, and repository visibility changes require explicit maintainer approval and independent verification.

## Acknowledgments

Banmao Fun builds on Next.js, React, TypeScript, Tailwind CSS, Wagmi, Viem, Ethers, Three.js, OpenZeppelin, X Layer, and the broader open-source ecosystem.

## License

Copyright (c) 2026 Hai V Con. Licensed under the [MIT License](LICENSE).
