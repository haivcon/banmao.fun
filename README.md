# Banmao Fun

Banmao Fun is a modular Web3 social, DeFi, collection, and GameFi application for X Layer. The interface combines a lightweight 2D landing page with an optional Three.js experience and direct wallet interactions.

## Technology

- Next.js 16, React 19, and TypeScript
- Wagmi, Viem, RainbowKit, and React Query
- Three.js, React Three Fiber, and Drei
- Solidity contracts and generated frontend ABIs

## Quick start

Use Node.js 20 and npm. `package-lock.json` is the canonical lockfile.

```bash
npm ci
npm run check
npm run dev
```

`npm run check` regenerates the BanmaoBox ABIs, runs TypeScript and ESLint, and executes the Jest suite.

## Environment

Copy `.env.example` to `.env.local` and configure only the services you need. Never commit credentials or private keys. Restart the development server after changing any `NEXT_PUBLIC_*` variable.

Deployment scripts use a separate local file based on `.env.deploy.example`.

## BanmaoBox

BanmaoBox is a permissionless, immutable Factory → per-ERC-20 Box → Renderer system. The application currently provides a BANMAO-focused direct-RPC interface; no backend holds signing keys or mediates redemption.

- X Layer Testnet (chain ID `1952`) deployment data is versioned in `deployments/banmaobox-xlayer-testnet.json`.
- X Layer Mainnet (chain ID `196`) is marked as not deployed and remains read-only.
- Per-chain `NEXT_PUBLIC_BANMAO_*` values are optional local overrides, not cross-chain fallbacks.
- The frontend verifies bytecode and Factory, Box, token, and renderer invariants before enabling writes.
- Generate contract ABIs with `npm run generate:banmaobox`.

To run the contract integration suite, start Anvil or another compatible JSON-RPC EVM at `127.0.0.1:8545`, then run:

```bash
npm run test:banmaobox
```

Read [`contracts/README.md`](contracts/README.md), [`CONTRIBUTING.md`](CONTRIBUTING.md), and [`SECURITY.md`](SECURITY.md) before changing contracts or deployments.

## Documentation

- [`contracts/README.md`](contracts/README.md): contract behavior, assumptions, deployment, and testing
- [`contracts/launchpad/README.md`](contracts/launchpad/README.md): launchpad Foundry setup and deployment order
- [`WEB3D_AUDIT.md`](WEB3D_AUDIT.md): Web3D architecture and risk review
- [`WEB3D_PERFORMANCE_BUDGET.md`](WEB3D_PERFORMANCE_BUDGET.md): quality targets and release budget
- [`WEB3D_QA_CHECKLIST.md`](WEB3D_QA_CHECKLIST.md): manual Web3D release checks
- [`MOBILE_COMPATIBILITY_REPORT.md`](MOBILE_COMPATIBILITY_REPORT.md): mobile layout review

Release history is available in Git history and GitHub releases.

## License

An open-source license has not been selected. Until a `LICENSE` file is added, the repository is source-available for review, but no permission to copy, modify, or redistribute it is granted.

---

Developed for the Banmao ecosystem.
