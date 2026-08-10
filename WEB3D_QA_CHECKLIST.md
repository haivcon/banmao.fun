# Web3D QA Checklist

Complete this checklist before releasing changes to the Web3D landing page.

## Automated checks

- [ ] `npm run check` succeeds.
- [ ] `npm run build` succeeds.
- [ ] A production server started with `npm run start` renders `/` correctly.
- [ ] The browser console has no repeated errors.
- [ ] No required asset request returns 404.

## Device coverage

- [ ] Capable desktop or laptop in Chrome and Edge.
- [ ] Typical laptop without a discrete GPU.
- [ ] Mid-range Android device.
- [ ] Entry-level Android device or CPU-throttled emulator.
- [ ] iPhone in Safari.
- [ ] iPad or another tablet.
- [ ] Viewport narrower than 390 px.
- [ ] 2K or 4K display.

## Quality modes

- [ ] Automatic selection chooses Low on constrained devices.
- [ ] Automatic selection chooses Medium on typical devices.
- [ ] High remains smooth on a capable desktop or laptop.
- [ ] Users can select Low, Medium, and High.
- [ ] The selected mode persists after refresh.
- [ ] Low omits the whale and other effects disabled by configuration.
- [ ] Medium does not download High-only assets.
- [ ] High remains within the configured DPR limit.

## Responsiveness and frame rate

- [ ] Low holds approximately 30 FPS on representative mobile hardware.
- [ ] Medium holds approximately 45 FPS on typical hardware.
- [ ] High approaches 60 FPS on capable hardware.
- [ ] Frame rate does not degrade significantly after two minutes idle.
- [ ] Returning from a background tab does not cause animation jumps.
- [ ] Scrolling and touch gestures remain responsive.
- [ ] A five-minute mobile session does not cause abnormal heat or battery use.

## WebGL fallback and accessibility

- [ ] The Canvas renders when WebGL is available.
- [ ] The 2D fallback appears when WebGL initialization fails.
- [ ] Reduced-motion preferences activate the fallback or low-motion experience.
- [ ] Primary navigation remains usable in fallback mode.
- [ ] Effects do not introduce disruptive flashing.
- [ ] Text and controls remain legible on mobile.
- [ ] iPhone safe areas do not cover controls.
- [ ] Keyboard focus and visible focus indicators work for DOM controls.

## Assets and network

- [ ] `public/models/banmao-whale.glb` is not requested when its quality setting disables it.
- [ ] `public/gamefi/banmaofomo/sprites.zip` is not requested by the landing page.
- [ ] Large images are loaded only where needed.
- [ ] Hidden assets are not preloaded unnecessarily.
- [ ] Production cache headers are appropriate.
- [ ] Mobile Lighthouse does not report severe oversized-image regressions.
- [ ] Initial transfer remains within `WEB3D_PERFORMANCE_BUDGET.md`.

## Memory and GPU

- [ ] Memory does not grow continuously during a five-minute idle test.
- [ ] Geometry and materials are not recreated each frame.
- [ ] Repeated quality changes do not lose the WebGL context.
- [ ] Resizing does not duplicate scene objects.
- [ ] Unmounting and remounting leaves no audio loop, timer, or listener running.

## Release gate

Do not release until all of these minimum conditions pass:

- [ ] TypeScript, lint, and tests pass.
- [ ] The production build passes.
- [ ] Low mode is usable on mobile.
- [ ] The 2D fallback works.
- [ ] No reproducible WebGL or iOS crash remains.
- [ ] Initial requests stay within the selected asset budget.
