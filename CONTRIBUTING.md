# Contributing

Thank you for helping improve Banmao Fun.

## Before opening a change

1. Discuss substantial product, protocol, or dependency changes in an issue first.
2. Never commit private keys, seed phrases, API credentials, production database files, or user data.
3. Treat smart-contract and wallet changes as security-sensitive. Keep them small and include tests.
4. Do not assume that a deployment address is valid. Update a versioned file in `deployments/` and document its verification evidence.

## Local development

Use Node.js 20 and npm. `package-lock.json` is the canonical lockfile.

```bash
npm ci
npm run check
npm run dev
```

BanmaoBox contract tests require a local JSON-RPC EVM at `127.0.0.1:8545` (for example Anvil):

```bash
anvil
npm run test:banmaobox
```

## Pull requests

- Use a focused branch and preserve unrelated work.
- Add or update tests for behavior changes.
- Run `npm run check` and relevant contract tests.
- Include deployment/chain details for Web3 changes.
- Describe security implications, rollback steps, and manual verification.
- Do not enable mainnet writes until bytecode, registry, token, renderer, and chain invariants have been independently verified.

## Contract principles

BanmaoBox is permissionless and immutable. Backend services may index public events, but must never custody signing keys, authorize withdrawals, or become necessary to redeem a box.

## License status

No open-source license has been selected yet. Contributions cannot be accepted for redistribution until the maintainers add a license and clarify contribution terms.
