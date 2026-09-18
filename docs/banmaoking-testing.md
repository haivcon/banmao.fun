# BanmaoKing test conventions

## Responsibilities

- `banmaoKingExpressions21.test.ts`: catalogue-wide invariants, generated face parity, six pose seeds, all public accessory IDs and whisker isolation.
- Expression-specific suites (Angry, Suspicious, etc.): authored choreography, timing and distinguishing features. Avoid repeating the entire catalogue matrix here.
- `banmaoKingSvgHelpers.test.ts`: regression tests for shared structural assertions.
- `tools/test-king-*-browser.cjs`: real SVG/XML parsing, image decoding, animation and pixels. Node string assertions are not proof that a browser can render SVG.
- Contract/codegen suites: generated Solidity parity and deployment constraints, separate from visual assertions.

## Shared assertions

Use `__tests__/helpers/banmaoKingSvg.ts` for:

- `svgGroupByClass`: exact group boundaries and immediate group parent, including nested children. Do not use a lazy regex ending at two closing groups: flat whisker groups can accidentally include a following face animation.
- `expectSvgReferences`: no undefined/NaN output, unique IDs, resolvable local href and url references.

The group scanner is deliberately limited to authored group structure; it is not a general XML parser. Its own tests cover nesting, siblings, comments, missing/duplicate selections and malformed groups.

## IDs and test data

Use `ACCESSORY_IDS` for public preview inputs. Public accessory IDs start at 1; artwork dispatch indices are a different domain. Never migrate internal artwork tests by blindly adding one to all numbers. Keep explicit catalogue-size assertions so accidental catalogue changes remain visible.

A token/pose seed is not an animation timestamp. Browser tests must seek or observe playback to validate animation over time.

## Running

From the repository root:

```powershell
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath __tests__/banmaoKingExpressions21.test.ts __tests__/banmaoKingSvgHelpers.test.ts __tests__/banmaoKingAngry.test.ts __tests__/banmaoKingComposedMotion.test.ts
node node_modules/jest/bin/jest.js --runInBand --testPathPatterns=banmaoKing --json --outputFile=test-results/banmaoking-jest.json
node tools/test-king-mini-browser.cjs
```

Ensure the result directory exists before specifying a JSON output path. A tool timeout is not a Jest result: check process completion and the final JSON summary. Preserve failing assertions until their current specification has been checked; do not remove suites or relax snapshots merely to obtain a green run.

## Incremental cleanup

Keep tests grouped by responsibility rather than merging all feature suites into one large file. Migrate duplicate structural checks to shared helpers as each suite is reviewed. Separate stale ID fixtures, obsolete exact artwork expectations, generated-file drift and actual rendering regressions before changing assertions. The initial cleanup covers catalogue/whisker and composed-SVG checks; it does not certify every legacy BanmaoKing suite.
