# Banmao Fun

A Web3 social, DeFi, GameFi, and AI experience built for X Layer.

**Live site:** [www.banmao.fun](https://www.banmao.fun)

**Network:** X Layer mainnet (`196`)

## Overview

Banmao Fun is a Next.js application that brings the Banmao ecosystem into one wallet-connected interface. It combines an adaptive 2D/3D landing experience with a community collection hub, DeFi utilities, on-chain games, and the feature-gated BANMAO AI assistant.

This repository contains implemented product surfaces and deployment configuration, but the presence of a route or contract integration does not guarantee that it is enabled or deployed in production. Always verify the active network, feature flags, and versioned deployment manifests before using a write path.

## Product surfaces

### Landing and Web3D

- Responsive landing page with 2D and Three.js experiences
- Token, market, burn, and community views backed by application APIs
- Adaptive Web3D quality controls and a 2D fallback
- Wallet connection and navigation into the collection, DeFi, and GameFi areas

### Collection and social hub

- Collection browsing, search, profiles, posts, comments, reactions, follows, and bookmarks
- Stories, quests, badges, leaderboards, notifications, tips, and daily check-ins
- Multilingual community interface and wallet-aware experiences
- Media workflows backed by configured storage services

### DeFi

- Staking views and actions, claim history, compounding, relocking, and leaderboards
- Token burn dashboards and contributor history
- Airdrop preparation, CSV processing, batching, progress tracking, and analytics
- BanmaoBox UI for transferable, time-locked ERC-20 gift boxes

BanmaoBox is exposed only on X Layer mainnet. The versioned [mainnet manifest](deployments/banmaobox-xlayer-mainnet.json) is the frontend source of truth for chain `196`; `factoryRenderer` records immutable Factory/Box constructor provenance, `defaultRenderer` records the renderer for future collections, and `boxRenderer` records the canonical Box's current active renderer. The UI enables write actions only after validating deployment addresses and runtime fingerprints; renderer provenance warnings do not hide safe read-only NFT discovery. See [contracts/README.md](contracts/README.md) for contract behavior and security assumptions.

### GameFi

Implemented game surfaces include:

- Banmao FOMO
- Banmao Snake
- Banmao Slots
- Rock Paper Scissors (RPS)
- Banmao PK

Availability depends on the relevant network, contract deployment, backend support, and runtime configuration. Testnet-only or otherwise unverified integrations must not be treated as production deployments.

## BANMAO AI

BANMAO AI is an in-application assistant designed around Banmao product surfaces. Its current implementation includes:

- Streaming chat over same-origin API routes and server-sent events (SSE)
- A multilingual interface for English, Vietnamese, Chinese, Korean, Russian, and Indonesian
- Model discovery and allowlisted model selection without silent provider fallback
- Lexical retrieval with an optional semantic provider for hybrid RAG
- Source citations and typed activity for retrieval and tool calls
- Registered page-action proposals with explicit review and confirmation before execution
- Read-only domain tools for supported DeFi, GameFi, collection, and market data
- Optional, browser-tab-only conversation memory that is off by default and expires locally
- Mascot, emotion, reduced-motion, and privacy controls
- An authenticated transaction copilot that prepares and simulates bounded drafts but does not sign or submit transactions

All BANMAO AI feature flags default to off. Chat, tools, RAG, domain advisors, and the transaction copilot can be enabled independently. Production use of the transaction copilot is additionally blocked unless distributed-state readiness is explicitly configured. Implemented or documented AI capabilities should not be interpreted as proof that they are enabled on the live site.

Start with the [BANMAO AI documentation](docs/ai/README.md), then review [operations](docs/ai/OPERATIONS.md), [privacy](docs/ai/PRIVACY.md), [rollout](docs/ai/ROLLOUT.md), and the [threat model](docs/ai/THREAT_MODEL.md).

## Technology

| Area | Technology |
|---|---|
| Application | Next.js 16 App Router, React 19, TypeScript 5 |
| Web3 | Wagmi, Viem, Ethers |
| Client state/data | TanStack Query, Zustand |
| 3D and motion | Three.js, React Three Fiber, Drei, Framer Motion |
| Styling | Tailwind CSS 4 and scoped CSS |
| Server/data integrations | Next.js Route Handlers, libSQL, Cloudinary |
| Contracts | Solidity, OpenZeppelin contracts, generated frontend ABIs |
| Quality | TypeScript, ESLint, Jest, GitHub Actions, gitleaks |
| Hosting | Vercel |

## Repository map

```text
.github/       Community standards, security policy, templates, and CI
__tests__/     Jest tests, including the BANMAO AI test suites
app/           Next.js routes, APIs, product surfaces, and UI components
components/    Shared application components
contracts/     Solidity source and contract documentation
data/          Checked-in application data
deployments/   Versioned, chain-specific deployment manifests
docs/ai/       BANMAO AI architecture, privacy, operations, and rollout docs
lib/           Shared client/server libraries, including AI orchestration
public/        Static assets and PWA resources
```

## Quick start

Use Node.js 20 and npm. `package-lock.json` is the canonical lockfile.

```bash
git clone https://github.com/haivcon/banmao.fun.git
cd banmao.fun
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Before submitting a change, run:

```bash
npm run check
```

## Environment configuration

Use [.env.example](.env.example) as the local template. It documents variable names and safe placeholders; never commit real credentials, private keys, session secrets, or production environment files.

| Category | Purpose | Exposure |
|---|---|---|
| X Layer | Chain ID, RPC, explorer, and optional per-chain BanmaoBox overrides | Public variables where prefixed with `NEXT_PUBLIC_` |
| WalletConnect | Wallet modal project configuration | Public project identifier |
| Cloudinary | Server-side media upload configuration | Server only |
| BANMAO AI core | API credential, default model, chat, tools, and RAG flags | Server only |
| BANMAO AI safety | Session/SIWE settings, budgets, timeouts, and distributed-state gate | Server only |
| AI domain modules | Transaction copilot and domain-advisor feature flags | Server only |
| Read-only chain access | Server-side X Layer RPC configuration | Server only |

Do not add `NEXT_PUBLIC_` to any AI credential, session secret, or other server-only value. Restart the development server after changing public environment variables.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm test` | Run the Jest suite |
| `npm run check` | Run type checking, linting, and Jest serially |

## Testing and quality

The required local quality gate is `npm run check`. GitHub Actions repeats type checking, linting, and Jest on pull requests and pushes to `main`, audits production dependencies at critical severity, and runs gitleaks secret scanning.

For AI-focused work, the local documentation also lists targeted suites and additional build, privacy, and safety checks. Contract changes require relevant contract testing and independent deployment verification; a manifest alone is not proof that runtime bytecode or invariants are correct.

## Deployment

The application is configured for Vercel. Updates pushed to `origin/main` are expected to flow through the repository's connected Vercel project; this repository does not require a manual deployment step for normal releases.

Deployment notes:

- Configure environment values in Vercel rather than committing them.
- Keep server-only settings out of client-exposed variables.
- `vercel.json` defines the repository's scheduled cleanup route.
- Vercel Preview behavior, production feature flags, external services, and chain write readiness must be verified in the target environment.
- A checked-in route, manifest, or feature flag documents implementation/configuration state, not guaranteed live availability.

## Security

Never commit private keys, seed phrases, API credentials, session secrets, production databases, or user data. Verify the chain ID, contract bytecode, registry relationships, token, immutable metadata renderer/admin, and active SVG renderer before enabling Web3 writes. Testnet contracts and mock tokens have no production value.

Report vulnerabilities privately as described in the [security policy](.github/SECURITY.md). Do not disclose exploitable issues in a public issue.

## Contributing and documentation

- [Contributing guide](.github/CONTRIBUTING.md)
- [Code of Conduct](.github/CODE_OF_CONDUCT.md)
- [Security policy](.github/SECURITY.md)
- [Contract documentation](contracts/README.md)
- [BANMAO AI documentation](docs/ai/README.md)

Please discuss substantial product, protocol, or dependency changes before opening a pull request, keep changes focused, and include tests and security notes where applicable.

## Project status and feature flags

Banmao Fun is under active development. Some capabilities depend on deployment manifests, wallet/network selection, external services, server configuration, or safety flags. In particular, BANMAO AI modules default off, BanmaoBox mainnet availability comes from the checked-in deployment manifest, and testnet-only integrations are not production features.

Use the live application for the currently exposed experience and the repository's source, environment template, and deployment manifests to understand implementation boundaries. Do not infer production enablement from source presence alone.

## License status

No open-source license has been selected, and no `LICENSE` file is present. The source is available for review, but no permission to copy, modify, or redistribute it is granted unless the maintainers provide that permission separately. The project should not be described as open source until a license is selected.
