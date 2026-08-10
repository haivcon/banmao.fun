# Banmao Slots

Banmao Slots is an X Layer slot game with wallet-based commit/reveal spins, multiple liquidity pools, player profiles, leaderboards, and pool-owner tools.

## Structure

```text
app/gamefi/banmaoslots/
├── page.tsx          # Route composition and game state wiring
├── layout.tsx        # Route metadata and shared layout
├── globals.css       # Route-wide layout, theme, and animation styles
├── admin/            # Administrative interface and translations
├── components/       # Game, result, pool, profile, and dashboard UI
├── hooks/            # Contract, profile, dashboard, and event logic
├── lib/              # ABIs, addresses, translations, sounds, and utilities
└── styles/           # Scoped shared styles
```

## Main modules

### Game interface

- `SlotMachineWindow.tsx`: reels, animation, spin controls, and result presentation
- `SlotMachineCabinet.tsx` and `SlotLever.tsx`: cabinet presentation and lever interaction
- `BetBar.tsx` and `SpinCountSelector.tsx`: bet and multi-spin controls
- `ResultModal.tsx` and `MultiSpinResultsModal.tsx`: single- and multi-spin results
- `VerifyModal.tsx` and `FairnessAccordion.tsx`: commit/reveal verification guidance

### Pools and house tools

- `PoolSelector.tsx` and `CreatePoolModal.tsx`: pool discovery and creation
- `PoolManagementCard.tsx`: deposits, withdrawals, and lifecycle actions
- `PoolProtectionPanel.tsx`: pool risk controls
- `PoolStatisticsChart.tsx` and `HouseDashboardPanel.tsx`: performance and owner dashboards

### Players and navigation

- `SlotsProfileCard.tsx`, `ProfileEditModal.tsx`, and `PlayerProfileViewer.tsx`: local player identity and statistics
- `TopWinnersPanel.tsx` and `ViewPlayerPanel.tsx`: rankings and public player views
- `MacOSDock.tsx`, `DraggablePanel.tsx`, and `OnboardingTour.tsx`: window navigation and onboarding

## Hooks

- `useSlotsGame.ts`: pool loading, bets, commit/reveal transactions, and spin results
- `useHouseDashboard.ts`: pool creation, funding, withdrawal, settings, and closure
- `useSlotsProfile.ts`: local profile and player statistics
- `useSlotsWebSocket.ts`: real-time event updates and reconnect behavior

## Library code

- `abis.ts`: contract ABIs, configured addresses, and constants
- `symbols.ts` and `tiers.ts`: symbol and pool-tier definitions
- `sounds.ts` and `confetti.ts`: feedback effects
- `slotsProfiles.ts` and `slotsAvatars.ts`: local profile persistence and avatar options
- `historyUtils.ts`, `toastUtils.tsx`, and `types.ts`: shared utilities and types
- `lib/i18n`: English, Vietnamese, Chinese, Korean, Russian, and Indonesian translations

## Contract interaction

The active application configuration is defined in `lib/abis.ts`. Confirm that file and the current deployment manifest before documenting or using an address; do not rely on historical addresses copied into prose.

The game uses commit/reveal transactions for verifiable outcomes and supports multiple pools and multi-spin flows. Client-side seed material is acceptable only when the committed value prevents changing the reveal after commitment. Never log unrevealed secrets or include private keys in frontend configuration.

## Development

From the repository root:

```bash
npm ci
npm run check
npm run dev
```

For a production verification:

```bash
npm run build
npm run start
```

Contract compilation and deployment procedures are documented in [`../../../contracts/README.md`](../../../contracts/README.md). Use the repository’s current scripts and deployment records rather than unversioned one-off commands.

## Maintenance priorities

`page.tsx` and `SlotMachineWindow.tsx` are large and should be changed carefully. Prefer extracting cohesive behavior over adding more inline state, style, or contract logic. In particular:

1. Keep contract reads and writes in typed hooks or libraries.
2. Preserve commit/reveal recovery and transaction error states.
3. Lazy-load infrequently used panels where it improves startup time.
4. Keep mobile panels within the viewport and test at 320–430 px widths.
5. Clean up timers, subscriptions, audio, and pending effects on unmount.
6. Preserve translations when adding user-facing strings.
7. Add tests around pool math, transaction state, result formatting, and reconnection behavior.

Player profiles use browser storage and can be cleared by the user. They must not be treated as authoritative on-chain identity or security data.
