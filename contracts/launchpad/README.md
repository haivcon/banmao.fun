# Launchpad contracts

This directory is a Foundry project for the bonding curve, LP locker and the
Uniswap v4 hook. The hook must be deployed at a CREATE2 address whose low
permission bits equal `BEFORE_INITIALIZE | AFTER_INITIALIZE | AFTER_SWAP`.

## Setup

```powershell
cd contracts/launchpad
forge install Uniswap/v4-core Uniswap/v4-periphery --no-commit
forge build
forge test
```

The `lib/`, `out/`, `cache/` and `broadcast/` directories are generated and
must not be committed. The repository's `remappings.txt` maps the installed
packages to the imports used by `LaunchpadHook.sol`.

## Deployment order

1. Deploy `MemeToken` implementation.
2. Deploy `LiquidityLocker(positionManager)`.
3. Deploy `BanmaoLaunchpad` with the implementation, Uniswap v4 addresses,
   WOKB, locker and Permit2.
4. Call `LiquidityLocker.setLaunchpad(launchpad)` from its deployer.
5. Mine and deploy `LaunchpadHook(poolManager, launchpad)` with the required
   hook flags. Do not deploy it with a normal CREATE transaction.
6. Call `BanmaoLaunchpad.setHookAddress(hook)`. It verifies the exact flags.
7. Set `NEXT_PUBLIC_LAUNCHPAD_ADDRESS` and
   `NEXT_PUBLIC_LAUNCHPAD_DEPLOYMENT_BLOCK` in the frontend environment.

Run a fork test of the full migration path before using a live deployment.
