# Independent wrist choreography

The left wrist now has 21 authored seven-beat tracks in `motion-direction.ts`, rather than negating the right wrist. Supporting hands in expressions 0, 2, 4, 9, 12 and 16 stay within four degrees; wiping and royal-command gestures receive stronger left-wrist accents. Existing left-side timing and the local (0,-12) pivot are unchanged.

The right wrist, held-object track, shield counter-rotation, shoulder geometry, paw visibility and trait ordinals are unchanged. `tools/sync-king-direction.cjs` exports the left tracks into Solidity and validates finite, bounded, closed loops. Run its `--check` mode to reject stale output.

Validation performed: 67 tests across IndependentWrists, Choreography and SecondaryMotion passed. `tools/validate-king-choreography.cjs` compiled and deployed the motion contract locally and confirmed exact frontend/EVM strings for all 21 expressions, including rejection of invalid ordinal 21. Ganache used its Node fallback because the native uWS binary was unavailable.

This is the independent-wrist stage only. Forearm deformation, elbow articulation, body squash/stretch, trails and contact effects are not implemented. Browser visual review, complete renderer size checks and production deployment are not certified by this stage. Source changes do not update existing immutable deployments.
