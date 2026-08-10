# Web3D Audit

## Scope

This review covers `app/page.tsx`, `app/web3d`, and the contexts and PWA components used by the 3D landing page. The current stack includes Next.js 16, React 19, Three.js, React Three Fiber, and Drei.

## Summary

The landing page provides a distinctive interactive scene with camera focus, animated objects, audio, localization, and DeX-style panels. Domain folders under `app/web3d` provide a useful foundation, and the current tree includes quality configuration, automatic quality selection, and a 2D fallback.

The main remaining risk is concentration of responsibility: `app/page.tsx` is still a large client component that combines scene composition, object definitions, animation, layout, interaction, localization, and PWA wiring. The scene also contains many independent frame loops, particles, lights, text objects, HTML overlays, and manual event listeners. These characteristics raise maintenance, accessibility, mobile performance, and failure-recovery costs.

This is a point-in-time engineering review, not proof that every issue remains open. Verify each observation against the current implementation before acting on it.

## Current strengths

- `app/web3d` is grouped by audio, buttons, components, configuration, contexts, effects, fallback, fonts, hooks, layouts, localization, panels, and theme.
- `app/web3d/config/performanceConfig.ts` defines Low, Medium, and High limits.
- `app/web3d/hooks/useWeb3DQualityMode.ts` supports automatic selection and saved user preferences.
- `app/web3d/fallback/Web3DFallback2D.tsx` and `app/web2d/Web2DLanding.tsx` provide non-3D experiences.
- Mobile behavior includes responsive camera/layout helpers, reduced effect counts, touch input, and pinch zoom.
- Some expensive browser-dependent components are loaded dynamically.
- Camera, theme, token data, suction, audio, and panel state use dedicated contexts or modules.
- Localization covers English, Vietnamese, Chinese, Korean, Russian, and Indonesian.
- PWA registration, installation prompts, offline status, and splash behavior are integrated.
- Many frame animations correctly mutate refs or Three.js objects rather than rendering React state every frame.

## Risks and recommendations

### P0: reliability and frame stability

#### Keep failure paths independent of WebGL

A Canvas exception or WebGL context failure must not leave a blank landing page. Keep fallback detection and error handling outside the Canvas tree. Test unsupported WebGL, context loss, reduced motion, and low-memory mobile scenarios.

#### Avoid React updates in frame loops

Continuous `setState` calls from `useFrame` can trigger render storms. Use refs and direct object or material updates for per-frame values, and update React state only for meaningful phase changes. Throttle any state that must expose animation data to the DOM.

#### Enforce quality budgets

Apply `performanceConfig.ts` consistently to particles, lights, model loading, DPR, and optional effects. Low mode should avoid downloading disabled high-quality assets, not merely hide them after loading. Pause nonessential animation and audio while the page is hidden.

#### Protect pointer handling

The camera controller manually handles pointer, wheel, touch, and pinch events. Track captured pointer IDs, handle `pointercancel`, guard release calls, and clean up drag state and cursors on unmount. Re-test interactions whenever React Three Fiber event handling changes.

### P1: architecture and maintainability

#### Reduce `app/page.tsx`

Move cohesive scene elements into focused modules. A practical target is:

```text
app/web3d/
  scene/
    Web3DCanvas.tsx
    SceneRoot.tsx
    SpaceBackground.tsx
    SceneLighting.tsx
  brand/
  effects/
  panel/
  config/
```

Keep page-level code responsible for composition and fallback selection, not individual visual implementations.

#### Centralize scene constants

Positions, colors, animation timing, camera bounds, breakpoints, and quality-dependent counts should use named configuration. Avoid scattering magic numbers through JSX.

#### Clarify panel semantics

Keep minimize, maximize, restore, dock, and close actions semantically distinct. Ensure context state matches visible controls and actual panel dimensions. If panel count grows, consider state selectors to avoid rerendering every consumer when one panel changes.

#### Manage Three.js resource lifetimes

Include every dynamic input in memo/effect dependencies. Dispose manually created geometry, material, texture, and line resources on unmount. Precompute random values or use smooth seeded noise instead of uncontrolled randomness each frame.

#### Separate presentation concerns

Move repeated inline styles and injected style blocks to scoped CSS or shared presentation components. Split sound, cursor, focus, and panel-frame behavior when a component accumulates unrelated responsibilities.

### P1: accessibility and UX

Canvas meshes are not semantic controls and 3D text is not exposed to screen readers. Every primary action needs a DOM equivalent with keyboard support, visible focus, labels, sufficient contrast, and an adequate touch target.

Also provide:

- concise instructions such as “Drag to rotate; select a panel to focus”;
- visible camera reset, mute, and quality controls;
- clear close/minimize/dock labels;
- reduced-motion behavior;
- a usable 2D menu on small or unsupported devices;
- audio activation only after a user gesture, with rejected play promises handled.

### P2: testing and observability

Add or maintain tests for:

- quality-mode selection and persistence;
- WebGL failure and fallback rendering;
- camera pointer cancellation and cleanup;
- localization helpers;
- panel-state transitions;
- smoke rendering of `/`;
- service-worker update and offline behavior.

Use runtime frame-rate and memory measurements on representative hardware. If sustained FPS falls below the selected mode’s target, reduce quality automatically rather than allowing a prolonged degraded experience.

## Performance profile

Likely load sources include concurrent `useFrame` callbacks, stars and particles, 3D text, HTML overlays, dynamic lights, opacity and color updates, hover and suction effects, audio loops, and continuous Canvas rendering.

Mobile devices add high-DPR cost, stricter memory limits, touch/scroll conflicts, battery drain, and WebGL context-loss risk. Follow [`WEB3D_PERFORMANCE_BUDGET.md`](WEB3D_PERFORMANCE_BUDGET.md) and validate releases with [`WEB3D_QA_CHECKLIST.md`](WEB3D_QA_CHECKLIST.md).

## Recommended order of work

1. Preserve and test Canvas error handling, WebGL fallback, and reduced-motion fallback.
2. Remove continuous React state updates from frame loops.
3. Enforce Low/Medium/High limits and prevent unnecessary asset downloads.
4. Extract scene and effect components from `app/page.tsx`.
5. Harden pointer capture, cursor cleanup, audio policy, and page-visibility behavior.
6. Add a keyboard-accessible DOM navigation layer.
7. Add smoke, fallback, panel-context, and localization tests.
8. Measure production builds on physical mobile and desktop hardware.

## Completion criteria

- `npm run check` and `npm run build` pass.
- The landing page remains usable when WebGL is unavailable.
- Low mode meets the mobile targets in the performance budget.
- Primary actions are accessible without pointer-only mesh interaction.
- No recurring resource leak, context loss, or background audio/animation remains after repeated mounting and visibility changes.
