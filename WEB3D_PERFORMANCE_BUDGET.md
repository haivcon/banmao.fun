# Web3D Performance Budget

The Web3D landing page must remain responsive on desktop, laptop, tablet, and mobile devices. Stable interaction takes priority over retaining every visual effect.

## Frame-rate targets

| Mode | Target device | Target | Notes |
|---|---|---:|---|
| Low | Entry-level mobile, limited-memory devices, reduced motion | Stable 30 FPS | Disable most expensive effects |
| Medium | Mid-range mobile and typical laptops | Stable 45 FPS | Retain primary effects with fewer particles |
| High | Capable desktop and laptop GPUs | 60 FPS | Enable more detail while limiting DPR |

## Render budget

| Category | Low | Medium | High |
|---|---:|---:|---:|
| Device pixel ratio | 0.75–1 | 1–1.25 | 1–1.5 |
| Stars | 350 | 900 | 1,800 |
| Floating particles | 4 | 12 | 32 |
| Glowing orbs | 2 | 5 | 10 |
| Primary sparkles | 0 | 25 | 80 |
| Secondary sparkles | 0 | 15 | 50 |
| Token coin segments | 32 | 48 | 64 |
| Token coin ridges | 24 | 36 | 48 |
| Maximum dynamic lights | 1 | 2 | 3 |
| Initial asset budget | ≤ 2 MB | ≤ 4 MB | ≤ 8 MB |
| Maximum texture dimension | 1,024 px | 1,536 px | 2,048 px |

Runtime limits are defined in `app/web3d/config/performanceConfig.ts`.

## Implementation rules

- Do not create geometry or material on every frame.
- Do not call React state setters continuously from `useFrame`; mutate refs or Three.js objects when appropriate.
- Clamp frame delta so animation does not jump after restoring a background tab.
- Lazy-load expensive components or gate them behind quality settings.
- Do not download high-quality-only models or textures in Low mode.
- Use instancing for repeated particles or objects when practical.
- Keep dynamic lights within `maxDynamicLights`.
- Respect `prefers-reduced-motion`; prefer the 2D fallback when it is enabled.
- Pause nonessential animation and audio while the document is hidden.
- Dispose manually created Three.js resources when their owners unmount.

## Large assets to monitor

| Asset | Approximate size | Guidance |
|---|---:|---|
| `public/gamefi/banmaofomo/sprites.zip` | 17.27 MB | Never preload on the landing page; load only inside the game |
| `public/models/banmao-whale.glb` | 7.16 MB | High mode only; consider Draco/Meshopt compression or a lower-detail model |
| GameFi sprite PNG files | 0.5–1.25 MB each | Convert to WebP/AVIF and lazy-load per game |
| `public/ui/dock/*.png` | 0.57–1.17 MB each | Resize to display dimensions and convert to WebP |
| `public/images/burn-3d/*.png` | 0.56–1.14 MB each | Convert to WebP and lazy-load |

Re-measure these values before relying on them; asset contents may change independently of this document.

## Release criteria

- Low mode holds approximately 30 FPS on a representative mid-range or entry-level Android device.
- Safari and iOS do not lose or crash the WebGL context during normal use.
- The 2D fallback works when WebGL fails or reduced motion is requested.
- Memory does not grow continuously during a five-minute idle test.
- Initial network transfer remains within the selected quality budget.
- `npm run check` and `npm run build` succeed.
