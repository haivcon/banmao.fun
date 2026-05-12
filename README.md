# Banmao Fun — Social Hub & DeFi Platform

## v0.3.3 — Web3D Stability Fix & Collection Progressive Loading

### 🎯 Web3D: Tab-Inactivity Crash Fix
Resolved a critical production issue where the 3D homepage would **lag, spin wildly, then freeze** after the browser tab was left inactive and revisited.

**Root Causes Identified & Fixed:**
- **`clock.elapsedTime` time-jump** — Three.js clock accumulates while the tab is backgrounded, causing position/rotation calculations to jump hundreds of radians on resume.
- **Unclamped frame delta** — `useFrame` delta equaled the entire inactive duration (e.g. 300s), causing incremental animations to process impossibly large time steps.
- **GPU memory leak** — `PulseRing` component created `new THREE.MeshBasicMaterial()` on every animation frame, causing cumulative memory degradation.

**Fix Applied (35 animation callbacks across 10 files):**
```tsx
// Pattern: Local accumulated time + delta clamping (max 100ms/frame)
const localTime = useRef(0);
useFrame((state, delta) => {
    localTime.current += Math.min(delta, 0.1);
    const time = localTime.current;
});
```

**Files Changed:**
| File | Fix |
|------|-----|
| `SwimmingWhale3D.tsx` | Local time + delta clamp |
| `BlackHole3D.tsx` | Delta clamp |
| `SharedEffects.tsx` | Material leak fix + delta clamp (6 hooks) |
| `AnimatedMascot.tsx` | Local time + delta clamp (ParticleAura + main) |
| `CameraFocusContext.tsx` | Delta clamp on camera lerp |
| `DancingLogo3D.tsx` | Local time + delta clamp (sparkles + main) |
| `FloatingParticles.tsx` | Local time + delta clamp (particles + orbs) |
| `TokenCoin3D.tsx` | Delta clamp + sub-components (sparkles, trail) |
| `TokenDistributionChart3D.tsx` | Local time + delta clamp (main + 4 sub-components) |
| `page.tsx` | All 11 inline `useFrame` callbacks fixed |

---

### ⚡ Collection: Progressive Paginated Loading
Optimized the Collection gallery page to handle 3000+ Cloudinary images without the long initial wait.

**Before:** Single monolithic API request fetched all 3000+ images → 5-10s blank screen.
**After:** Progressive paginated loading in 500-image batches → first images visible within ~1-2s.

- First batch renders immediately; subsequent batches stream in the background.
- Live progress bar shows `Loading 1500/3200` with animated gradient fill.
- Folders, search, and sort are functional from the first batch.
- Cleanup on unmount prevents memory leaks from abandoned fetch chains.

**Files Changed:**
- `CollectionClient.tsx` — Replaced monolithic fetch with async paginated loop + progress indicator UI.

---

<details>
<summary><strong>Past Updates (v0.3.2 and older)</strong></summary>

### v0.3.2 — OKX API Optimization & Redundancy Elimination
- Comprehensive OKX Web3 API audit across 14 backend routes.
- Eliminated 2 redundant polling loops (~34% reduction in API load per session).
- Consolidated price data source into shared `TokenStatsContext`.

### v0.3.1 — Branding & UI Optimization
- Animated mascot asset transition to transparent `.gif` format.
- Service Worker caching update for offline GIF support.
- Dynamic 3D scaling and responsive viewport clamping for mobile.

### v0.3.0 — Web3D Performance Engine Upgrade
- Major rendering optimizations for the 3D homepage.

### v0.2.0 — Mobile-First Hub Redesign
- Instagram-style floating pill bottom navigation.
- Full i18n localization across 6 languages (EN, VI, ZH, KO, RU, ID).

</details>

---
*Developed by AI Agent — Focused on Premium Web3 UX.*
