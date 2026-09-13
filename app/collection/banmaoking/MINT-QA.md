# Banmao King frontend QA

The page uses the existing root wagmi provider and mainnet deployment. No deployer key is used. All writes require the connected user's signature.

## Implemented
- Separate preview and mint panel, Vietnamese/English copy.
- Exact approval (reset nonzero insufficient allowance first), separate mint signature.
- Fresh configuration/balance/allowance checks and simulation before submission.
- Receipt event decoding, on-chain image in an img element, metadata retry.
- Per-wallet latest transaction hash persistence; pending receipt blocks duplicate clicks.

## Post-mint metadata refresh
- Separate wallet signature and OKB gas; rejecting or reverting refresh does not undo mint success.
- Refresh hash/confirmation is persisted per account/token. The refresh component polls only the original hash: speed-up/cancellation recovery is not implemented and can leave it pending indefinitely. Check the wallet/Explorer before any manual recovery.
- Automated refresh checks are source regressions, not behavioral wallet tests. Account/network changes, reload recovery and the mint-to-refresh busy handoff still require wallet QA.
- The original SVG is displayed and downloadable. Browser animation (including reduced-motion settings) and marketplace thumbnails still require visual QA.

## Required before public release
- Test wallet rejection, account/network changes during signatures, mobile wallet return-to-browser.
- Test insufficient OKB, approval then mint revert, sold out and RPC outage.
- Test transaction speed-up/cancel and reload while pending. Replacement detection works during the active receipt waiter; a replacement while the page is closed can leave the original persisted hash pending indefinitely. Do not clear that state or submit again without checking the wallet/Explorer.
- Inspect responsive rendering in a browser and verify hosting production addresses.
- Current automated tests cover preview regression, immutable configuration guards and metadata validation, not an end-to-end wallet flow.
- No paid mainnet mint test has been performed by the coding agent.

Hosting publication, collection navigation visibility and search indexing remain separate release steps.
