# Expressive rig follow-up

## Implemented
- Continuous forearm Bezier deformation for 21 expressions. Only cubic control X coordinates change (maximum 3 SVG units); shoulder and wrist endpoints remain fixed. This is silhouette flex, not a two-bone elbow/IK solver.
- Palm pad opacity modulation and existing local palm squeeze remain separate from wrist attachment.
- Dedicated volume scale with reciprocal X/Y, anchored at (256,490). Energetic scale range .985–1.02; selected idle expressions breathe up to 1.008. All character layers and accessories share this parent.
- Solidity character group now carries data-accessory, matching preview grip selectors.
- Independent wrists and generated Direction are preserved.

## Contract deployment changes (source only)
The old secondary data parts exceeded EIP-170 after adding geometry. The generated router now takes `address[11]`, ordered SecondaryMotion0 through SecondaryMotion10, two expressions per part (last part one). No setter exists.
The renderer constructor now takes eight addresses: body, expression, accessory, background expansion, motion0, motion1, secondary router, artUpgrade. Deploy ArtUpgrade separately; inline construction exceeded the initcode limit. Existing immutable deployments and mint addresses are unchanged.

Measured with solc, optimizer 200, Shanghai:
- Renderer runtime 21,114 bytes; initcode including 256 bytes constructor arguments 45,259 bytes.
- Largest secondary part runtime 21,822 bytes.
- All compiled artifacts pass 24,576 runtime / 49,152 initcode checks.

## Validation
- Four focused Jest suites: 89/89 passing.
- Exact local-EVM string parity: secondary motion for 21 expressions, expression layers for 21 expressions, 17 body/background effects, Cyborg and art upgrades; invalid IDs rejected.
- Chrome checks: all 21 forearms actually deform and volume scales animate; normal and reduced-motion preference environments, standard and shield variants passed.
- Generated art effects and Direction freshness passed.
- Broad King Jest run has failures (including old geometry/whisker/royal expectations and security tests); do NOT describe the entire repository as green. No baseline comparison established ownership of these failures.
- Human visual review, full assembled renderer EVM SVG comparison, full production build and exhaustive accessory sampling remain outstanding.

## Deliberately not added
No duplicate-arm trails, fake hand/face contact sparks, independent two-bone elbows, or collision solver. Existing floor-contact shadows and shuffle foot tracks are retained, not new features.

## Local files
Repository rules ignore tools and __tests__ directories. The new expressive-rig migration and Jest test exist locally but must be explicitly included in any reviewed commit; no commit has been made.
