# Security Policy

## Supported versions

Only the latest code on the default branch is considered for security fixes. Deployed smart contracts are immutable; a frontend fix cannot change deployed bytecode.

## Reporting a vulnerability

Do **not** open a public issue for vulnerabilities, exposed credentials, or exploitable deployment mistakes. Contact the maintainers through a private repository security advisory. If private advisories are unavailable, contact the project owner through the verified channel listed on the Banmao Fun website and request a secure reporting channel before sharing details.

Include affected commit/deployment addresses, chain ID, impact, reproduction steps, and suggested mitigation. Do not access other users' assets or data, degrade production services, or publish an exploit before remediation is coordinated.

## Scope notes

- BanmaoBox redemption is direct and permissionless; no backend should hold keys or mediate withdrawals.
- ERC-20 behavior can change or prevent transfers. Rebasing, fee-on-transfer, blacklistable, pausable, or upgradeable tokens carry additional risk.
- A deployment manifest is not proof by itself. Verify chain ID, runtime bytecode, Factory registry, Box underlying token, and renderer invariants before enabling writes.
- Testnet contracts and mock tokens have no production value.

## Secrets

If a secret is committed, revoke and rotate it immediately. Removing it in a later commit does not remove it from Git history.
