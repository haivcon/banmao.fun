# World Cup Yield Wars Sync Guide

This directory contains the World Cup Yield Wars frontend module.

## Synchronization Checklist
When syncing updates from the standalone `WorldCupYieldWars_XLayer` project into the `banmao-fun-full` repository, make sure you copy **ALL** of the following folders to avoid runtime crashes or missing assets:

1. **Frontend UI & Logic**
   - Source: `WorldCupYieldWars_XLayer/frontend/worldcup` (DO NOT copy from `app/gamefi/worldcup` as it might be outdated)
   - Target: `banmao-fun-full/app/gamefi/worldcup`
   - Command: 
     ```powershell
     Copy-Item -Path "WorldCupYieldWars_XLayer\frontend\worldcup\*" -Destination "banmao-fun-full\app\gamefi\worldcup" -Recurse -Force
     ```
   - **CRITICAL:** After copying, you MUST immediately restore the mono-repo specific files so you don't break Vercel:
     ```powershell
     git restore app/gamefi/worldcup/layout.tsx app/gamefi/worldcup/hooks/useWorldCup.ts
     ```

2. **API Routes (Mascots & OKX)**
   - Source: `WorldCupYieldWars_XLayer/app/api/mascots` and `WorldCupYieldWars_XLayer/app/api/okx`
   - Target: `banmao-fun-full/app/api/mascots` and `banmao-fun-full/app/api/okx`

3. **Public Assets (Images)**
   - Source: `WorldCupYieldWars_XLayer/public/mascots`
   - Target: `banmao-fun-full/public/mascots`

4. **Smart Contracts (If modified)**
   - **Contracts:** Copy `WorldCupYieldWars_XLayer/contracts/WorldCupYieldWars.sol` to `banmao-fun-full/contracts/WorldCupYieldWars.sol`

## Troubleshooting
- **Wagmi TypeScript Error (`Type instantiation is excessively deep`)**: When syncing `hooks/useWorldCup.ts` from the standalone repo, remember to add `// @ts-ignore` above every `useReadContracts` call that accepts a dynamic array of contracts. Next.js (Vercel) will crash during build due to infinite type inference loops if you don't suppress it. It is recommended to apply this fix permanently in the standalone repo.
- **`TypeError: Cannot read properties of undefined (reading 'ReactCurrentDispatcher')`**: This usually happens if the Next.js cache is corrupted during a hot-reload after a massive folder copy. Restart the Next.js dev server (`ctrl+c` then `npm run dev`) or clear the `.next` folder.
- **Missing Images**: Ensure the `public/mascots` folder was correctly copied.
- **Hydration/Script Errors**: Ensure `<Script>` from `next/script` is used instead of native `<script>` tags when injecting global scripts in Next.js layouts.
