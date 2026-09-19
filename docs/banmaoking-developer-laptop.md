# Developer Laptop code screen

Developer Laptop retains public accessory ID 17 / artwork index 16. Its graphite shell lives in the expansion catalogue; the compositor appends token-specific SVG text after the shell. The accessory interface is unchanged.

`developer-laptop.ts` and `BanmaoKingLaptopCode.sol` use `keccak256(abi.encodePacked("developer-laptop-v1", tokenId)) % 4`. The frontend uses ethers' matching packed hash. Selection is cosmetic and deterministic, not unpredictable mint randomness. Four short snippets use mint, verify, deploy or build. Every screen includes the full decimal token ID, so distinct token IDs have distinct text even when their snippet selection matches.

Three monospace text rows use the existing six-second opacity cycle. Static renderers retain opacity .85; cursor, progress and success animation remain in the shell. Lines over 25 characters use SVG textLength to stay within 84 units. Extremely large uint256 IDs remain represented but are not realistically legible at thumbnail scale. Fixed ASCII templates and validated unsigned integer IDs prevent XML injection. No external fonts, JavaScript in SVG, storage writes or oracle are required.

Preview input remains a safe integer number; the standalone text helper also accepts bigint up to uint256 max. Both implementations must change together if the domain, snippet templates, geometry or timing changes.

Local validation lives under /__tests__/; local generators and previews live under /.tmp/. The EVM parity test compiles with optimizer runs 200, viaIR and Shanghai. Deployment must use its own approved compiler configuration and verify runtime/initcode limits, gas and full renderer parity. Source changes do not update an existing deployed immutable renderer. No deployment is performed by the artwork generator.

Validation on 2026-09-19: full renderer bytecode generation succeeded with the above settings, but runtime measured 45,735 bytes, exceeding the standard EIP-170 limit of 24,576. This workspace includes other in-progress artwork changes; no baseline attribution was made. Treat deployment as blocked pending renderer size work and chain-specific validation.
