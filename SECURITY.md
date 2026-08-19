# Security Policy

## Supported code

Security fixes target the latest code on the default branch. Deployed smart contracts may be immutable; a frontend update cannot change their bytecode or bypass their rules.

## Report vulnerabilities privately

Do not open a public issue for a vulnerability, exposed credential, or exploitable deployment mistake. Use a [private GitHub Security Advisory](https://github.com/haivcon/banmao.fun/security/advisories/new).

Include the affected commit or deployment address, chain ID, impact, minimal reproduction steps, and a suggested mitigation when possible. Do not include secrets in the report, access other users' assets or data, degrade production, or publish an exploit before remediation is coordinated.

There is no public vulnerability-reward commitment unless the maintainers announce one separately.

## Security boundaries

- BanmaoBox redemption is direct and non-custodial; no backend should hold signing keys or mediate withdrawals.
- Timelocks do not provide an early-unlock mechanism. Maintainers cannot override a valid lock.
- ERC-20 behavior can change or prevent transfers. Fee-on-transfer, rebasing, blacklistable, pausable, and upgradeable tokens carry additional risk.
- A manifest is not proof of a deployment. Verify chain ID, runtime bytecode, Factory registry, underlying token, and renderer relationships before enabling writes.
- Testnet contracts and mock tokens have no production value.

If a credential is committed, revoke and rotate it immediately. Removing it in a later commit does not remove it from Git history; history remediation and a new full-history scan are also required before publication.
