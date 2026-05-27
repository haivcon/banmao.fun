# World Cup Yield Wars Sync Guide

This directory contains the World Cup Yield Wars frontend module.

## Synchronization Checklist
When syncing updates from the standalone `WorldCupYieldWars_XLayer` project into the `banmao-fun-full` repository, make sure you copy **ALL** of the following folders to avoid runtime crashes or missing assets:

1. **Frontend UI & Logic**
   - Source: `WorldCupYieldWars_XLayer/app/gamefi/worldcup`
   - Target: `banmao-fun-full/app/gamefi/worldcup`
   - Command: `Copy-Item -Path "WorldCupYieldWars_XLayer\app\gamefi\worldcup" -Destination "banmao-fun-full\app\gamefi" -Recurse -Force`

2. **API Routes (Mascots & OKX)**
   - Source: `WorldCupYieldWars_XLayer/app/api/mascots` and `WorldCupYieldWars_XLayer/app/api/okx`
   - Target: `banmao-fun-full/app/api/mascots` and `banmao-fun-full/app/api/okx`

3. **Public Assets (Images)**
   - Source: `WorldCupYieldWars_XLayer/public/mascots`
   - Target: `banmao-fun-full/public/mascots`

4. **Smart Contracts & Backend (If modified)**
   - **Contracts:** Copy `WorldCupYieldWars_XLayer/contracts/*` to `banmao-fun-full/contracts/`
   - **Scripts:** Copy `WorldCupYieldWars_XLayer/scripts/deploy.js` and `optimize-mascots.js` to `banmao-fun-full/scripts/`
   - **ABI/Artifacts:** Copy the entire `WorldCupYieldWars_XLayer/artifacts/` folder to `banmao-fun-full/artifacts/` (or run `npx hardhat compile` inside `banmao-fun-full` if `hardhat.config.js` is present).
   - **Hardhat Config:** Copy `WorldCupYieldWars_XLayer/hardhat.config.js` to `banmao-fun-full/hardhat.config.js`.

## Troubleshooting
- **`TypeError: Cannot read properties of undefined (reading 'ReactCurrentDispatcher')`**: This usually happens if the Next.js cache is corrupted during a hot-reload after a massive folder copy. Restart the Next.js dev server (`ctrl+c` then `npm run dev`) or clear the `.next` folder.
- **Missing Images**: Ensure the `public/mascots` folder was correctly copied.
- **Hydration/Script Errors**: Ensure `<Script>` from `next/script` is used instead of native `<script>` tags when injecting global scripts in Next.js layouts.
