# Banmao Fun - Social Hub & DeFi Platform

## v0.6.1 - OKX API Key Rotation & Stabilization

This release introduces a centralized OKX API Key rotation system and refactors all DEX integrations to use it, preventing Web3 features from dropping out due to rate limits.

### Upgrades & Fixes

- **OKX API Key Rotation:** Added a centralized `okxClient` that automatically detects and cycles through backup keys (`OKX_API_KEY_1`, `_2`, etc.) when encountering HTTP 429 or 50011 errors.
- **DEX Route Refactoring:** Rewrote 15 API routes (including balances, advanced-info, trades) to use `okxFetch` directly, removing heavily duplicated authentication and signing code.
- **Backend Stability:** Added missing TypeScript imports and fixed Turbopack syntax issues encountered during AST replacements.

<details>
<summary><b>v0.6.0 - Backend Sync & Vercel Build Stability</b></summary>

This release synchronizes the upgraded Smart Contracts from the standalone repository while fixing critical Vercel deployment blockers related to Next.js Turbopack and Wagmi type inference.

### Upgrades & Fixes

- **Smart Contract Sync:** Upgraded `WorldCupYieldWars.sol` to support the new constructor parameters (`tournamentDuration` instead of `isMainnet`).
- **Vercel Build Stability:**
  - Resolved `Turbopack` path resolution errors by enforcing Next.js TypeScript aliases (`@/lib/emptyModule.ts`) over absolute directory paths in `next.config.mjs`.
  - Suppressed Wagmi's "excessively deep type instantiation" build crashes by applying `// @ts-ignore` boundaries around highly dynamic `useReadContracts` hooks in `useWorldCup.ts`.
- **Repo Architecture Cleanup:** Removed standalone Hardhat artifacts, cache, and config from the monolithic Next.js repository to ensure a pristine Next.js build environment.
- **Frontend Logic:** Integrated extended country code mappings for English team aliases in `worldCup2026Fixtures.ts`.

</details>

<details>
<summary><b>v0.5.1 - World Cup 2026 Schedule and Bracket Sync</b></summary>

This release synchronizes the latest World Cup Yield Wars module into the full Banmao Fun platform while preserving the platform-specific routing and scroll wrappers.

### World Cup Yield Wars Updates

- Synced the World Cup 2026 fixture timeline, group standings, and knockout bracket UX from the standalone `WorldCupYieldWars_XLayer` repo.
- Added Turso-backed World Cup API routes:
  - `/api/worldcup/fixtures`
  - `/api/worldcup/bracket`
- Added the canonical group-stage CSV schedule at `test/lịch thi.csv`.
- Fixture times are imported from Vietnam time, stored as UTC, and rendered by selected UI language.
- Added a user-facing schedule tab with match-day timeline cards.
- Added a bracket guide explaining the 48-team group stage and 32-team knockout transition.
- Reworked admin World Cup tabs for clearer operations.
- Improved admin card ordering, responsive layout balance, scrollbars, and mobile readability.

### Platform Notes

- The full Banmao Fun project keeps its own `app/gamefi/worldcup/layout.tsx` and `ScrollEnabler` integration files.
- Local secrets remain in `.env.local` and are ignored by Git.
- `test/lịch thi.csv` is intentionally unignored because the World Cup API uses it as a safe fixture fallback when Turso is empty.
</details>

## Current Stack

- Next.js 16, React 19, TypeScript.
- Wagmi, Viem, RainbowKit, React Query.
- Turso/libSQL for World Cup fixture and bracket state.
- Existing Banmao Fun modules for hub, DeFi, staking, collection, and games.

## Environment

Required World Cup-related variables:

```env
NEXT_PUBLIC_WORLDCUP_CONTRACT_ADDRESS=0x25CB88C3db405Fdd9Ad5C059808eDE3DbC92D01a
NEXT_PUBLIC_BANMAO_TOKEN_ADDRESS=0xYourStakingToken
NEXT_PUBLIC_XLAYER_CHAIN_ID=196
NEXT_PUBLIC_XLAYER_RPC_URL=https://rpc.xlayer.tech
NEXT_PUBLIC_XLAYER_EXPLORER_URL=https://web3.okx.com/explorer/x-layer

TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

Restart the dev server after changing `NEXT_PUBLIC_*` values.

## Run

Use Node.js 20 and npm. `package-lock.json` is the canonical lockfile.

```bash
npm ci
npm run check
npm run dev
```

## BanmaoBox

BanmaoBox uses a permissionless, immutable Factory → per-ERC20 Box → Renderer design. The application currently provides a BANMAO-focused, direct-RPC interface; no backend holds keys or mediates redemption.

- X Layer Testnet (`1952`) deployment details are versioned in `deployments/banmaobox-xlayer-testnet.json`.
- X Layer Mainnet (`196`) is explicitly marked not deployed and remains read-only.
- Frontend environment variables are optional, per-chain local overrides only.
- The frontend validates bytecode and Factory/Box/token/renderer invariants before enabling writes.
- Contract ABIs are generated from Solidity with `npm run generate:banmaobox`.

Run the BanmaoBox contract integration suite against a local JSON-RPC EVM (for example Anvil on port 8545):

```bash
npm run test:banmaobox
```

See `contracts/README.md`, `CONTRIBUTING.md`, and `SECURITY.md` before changing contracts or deployments.

## License

An open-source license has not been selected yet. Until a `LICENSE` file is added, the repository is source-available for review but no permission to copy, modify, or redistribute is granted.

World Cup routes:

```text
/gamefi/worldcup
/gamefi/worldcup/admin
```

## Previous Releases

Older releases focused on Next.js SSR stabilization, localStorage guards, World Cup integration, X Layer provider alignment, global scroll fixes, Web3D performance, collection loading, OKX API optimization, and mobile-first hub design.

---

Developed for the Banmao ecosystem.
