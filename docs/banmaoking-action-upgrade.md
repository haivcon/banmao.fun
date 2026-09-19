# Expression action upgrade (2026-09-19)

Eight existing IDs retain their names, durations and seven-beat loop endpoints:

- 0 Happy Smile: supporting-arm accent, alternating foot lifts, livelier tail tip.
- 5 Surprised: asymmetric raised palms, stronger recoil and local foot lifts. Secondary body/volume/tail timing now uses the same .26/.30 startle beats as the body track.
- 6 Determined: two-arm braced stance, outward foot angles and sustained tail tension.
- 7 Teary: small alternating foot angles, sagging tail and subtle uneven volume breath; existing wipe gesture retained.
- 11 Zen: slow arm opening, five-unit float, deeper reciprocal-volume breath.
- 15 Whistling: alternating taps, conducting sway and delayed tail accents.
- 16 Suspicious: raised questioning hand, alternating sneaking steps and nervous tail tip. This is not certified hand-to-chin contact.
- 20 Royal Decree: lead-foot lift/plant and firmer held tail; existing command gesture retained.

Canonical profiles remain Solidity-owned; choreography.json is generated. Independent left wrists remain TypeScript-owned and exported with the Direction generator. Secondary motion was regenerated alone with the existing generator logic because the broad art generator reports unrelated expression output stale. No face geometry, IDs, mint behavior or deployments were changed.

Validation: new local Jest regression passes 10/10 tests, including markup construction for all 25 public accessories across the eight changed expressions. Choreography and Direction freshness checks and scoped git diff whitespace checks pass. Two existing rig/wrist suites report 23 failures and 21 passes (legacy accessory ID 0 and differing wrist expectations among the failures). Full EVM choreography string parity fails; no claim of frontend/on-chain assembled SVG parity is made. Browser playback validation exceeded the command timeout; visual collision freedom and final renderer size limits are not certified. Source edits do not update immutable deployed NFTs.
