# Contributing to Banmao Fun

Thanks for contributing. Keep changes focused, discuss substantial product, protocol, or dependency changes in an issue first, and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

Use the Node.js version in `.nvmrc` and npm. `package-lock.json` is the canonical dependency lockfile.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Never copy production credentials into `.env.example` or commit `.env*`, private keys, seed phrases, user data, or local databases.

## Canonical quality commands

| Command | Scope |
|---|---|
| `npm run check:generated` | Regenerate BanmaoBox ABI/release outputs and reject drift or a missing hash-versioned release |
| `npm run typecheck` | TypeScript without emitting files |
| `npm run lint` | ESLint |
| `npm test -- --runInBand` | All Jest-discovered `__tests__/**/*.test.ts` files serially |
| `npm run test:contracts` | BanmaoBox Solidity/security suite |
| `npm run test:release` | BanmaoBox immutable verification-release suite |
| `npm run check` | Generated artifacts, typecheck, lint, and all Jest tests |
| `npm run build` | Production Next.js build |

The repository currently has one Jest configuration and no Jest projects. Do not use `--selectProjects`. Tests stay in their existing topology: broad application suites under `__tests__/`, AI suites under `__tests__/ai/`, and the contract suite under `__tests__/contracts/`.

## Generated BanmaoBox artifacts

Physical contract source is under `contracts/BanmaoBox/`. After an approved source change, run:

```bash
npm run generate:banmaobox
npm run generate:banmaobox:release
npm run check:generated
```

Commit the current generated ABI, candidate release, verification release, and hash-versioned immutable release together. Never overwrite or delete historical files in `deployments/banmaobox-releases/` or deployment manifests. A deployment manifest is not proof by itself: verify chain ID, bytecode/runtime fingerprints, Factory registry, token, and renderer relationships independently.

Legacy `contracts/banmaobox/*.sol` strings in compiler input and Explorer contract names
are intentional virtual provenance identifiers and must not be changed to physical paths.

Deployment, Explorer publication, and verification scripts are maintainer operations. They are not CI quality commands. Do not run deploy/publish scripts for an ordinary contribution.

## Pull requests

- Use a focused branch and add tests for behavior changes.
- Run `npm run check`, relevant focused tests, and `npm run build` before requesting review.
- Explain security implications, chain/address changes, generated artifacts, and rollback/disable behavior.
- Do not include generated build output, previews, local environment files, or unrelated tests.
- Use conventional commit subjects where practical, such as `fix:`, `feat:`, `docs:`, or `chore:`.

## Web3 principles

BanmaoBox is non-custodial: users interact with contracts from their wallets, and no backend should hold signing keys or become necessary to redeem a box. Timelocks intentionally prevent early unlock; maintainers cannot bypass them. Token behavior (including pausing, blacklisting, fees, or rebasing) can still affect transfers.

Report vulnerabilities privately according to [SECURITY.md](SECURITY.md), never in a public issue.
