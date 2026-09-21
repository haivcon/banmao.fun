# Repository hygiene

GitHub stores production source, required assets, lockfiles, configuration, documentation and repository policy. Local verification code is intentionally not distributed.

## Local layout

- `__tests__/`: Jest tests, helpers and fixtures; ignored and not tracked.
- `.tmp/logs/`: command output. Never write logs in the repository root.
- `.tmp/scripts/`: new one-off verification/debug scripts.
- `.tmp/results/`: screenshots, browser profiles and diagnostic reports.
- `.tmp/coverage/`, `.tmp/jest-cache/`: Jest output.
- `scripts/`, `tools/`: existing local codegen/deployment/browser tooling. These remain local-only; relative-path dependencies prevent blindly moving them. Do not create new scattered tooling directories.

Framework-managed caches such as `.next/` and `node_modules/` are exempt. Deployment manifests, canonical generated artwork, databases, environment files and references are NOT disposable logs. Preserve valuable baselines and release provenance.

## Enforcement

Read `.clinerules` before working. Never negate the ignore rules or use `git add -f` for local material. Ignore rules do not affect already tracked files.

Enable the tracked hook after cloning: `git config core.hooksPath .githooks`. The pre-commit hook and CI inspect tracked paths, including files force-added despite ignore rules. Do not bypass them. CI is a backstop, not a replacement for review or branch protection.

## Validation

On a developer machine with the local test workspace, run `npm run check` and report actual results. A fresh GitHub checkout intentionally does not include tests or private deployment provenance. CI runs repository hygiene, TypeScript, ESLint, dependency audit and secret scanning; it does not claim Jest/generated-artifact coverage. Do not use `--passWithNoTests` to disguise missing validation.

Stage only explicit paths and inspect the staged diff. A cleanup commit removes files from that branch's current tree, not historical commits or other branches. History rewriting, credential rotation and cleanup of other branches are separate operations requiring review.
