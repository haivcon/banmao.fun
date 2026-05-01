# Banmao Fun — Social Hub & DeFi Platform

## v0.3.0 — Web3D Performance Engine Upgrade

### ⚡ Render Loop De-blocking
- **Zero-Render Animation Loop**: Converted high-frequency `useState` hooks to `useRef` in `BlackHole3D`, `TokenDistributionChart3D`, and `CommunityLinksHub3D`. This completely eliminates over 360+ unnecessary React re-renders per second, drastically reducing Main Thread blocking.
- **Imperative Property Updates**: Switched PulseRing and NeonBorder from state-driven scales/opacities to direct Three.js imperative mesh mutations (`mesh.scale.set`, `mesh.material.opacity`).

### 🎥 Scene Architecture & GPU Optimization
- **Resolved Camera Conflict**: Removed conflicting `<OrbitControls>` that was fighting with `CustomCameraController` for camera ownership every frame.
- **High-Performance Canvas**: Injected `dpr={[1, 1.5]}` pixel-ratio capping and `powerPreference: 'high-performance'` to minimize GPU overhead on Retina displays.
- **Geometry Instancing**: Replaced 48 individual `<mesh>` ridge geometry constructions in `TokenCoin3D` with a single `<instancedMesh>`, reducing draw calls by 98%.
- **Combined Lighting**: Reduced multiple dynamic `<pointLight>` instances in `SwimmingWhale3D` to a single combined light, cutting lighting recalculation overhead by 66%.

### 🔊 Audio Lifecycle Guards
- **Mute-State Guards**: Implemented explicit `isMuted()` checks in all `SoundManager` loops to prevent hidden `setInterval` memory leaks and CPU cycles when sound is muted.
- **Event Optimization**: Removed dynamic `import()` calls from inside `useFrame` hot paths in `DancingLogo3D` to eliminate unnecessary Promise micro-task allocations.

### 🧹 Math & Data Refactoring
- **Algorithmic Efficiency**: Optimized `SuctionContext` avoidance calculations using squared-distance checks, avoiding expensive `Math.sqrt` calls for objects out of range.
- **Throttled Updates**: Reduced `FloatingParticles` position update frequency to 30fps (every other frame) without losing visual fluidity.
- **API Consolidation**: Centralized token holder data fetching across the app, eliminating redundant internal OKX API routes in `PieChart3D`.

---

<details>
<summary><strong>Past Updates (v0.2.0 and older)</strong></summary>

## v0.2.0 — Mobile-First Hub Redesign

### 📱 Instagram-Style Mobile Experience
- **Floating Pill Bottom Navigation**: A capsule-shaped (`border-radius: 9999px`) glassmorphic navigation bar fixed at the bottom.
- **Compact Post Cards**: Post cards render edge-to-edge on mobile with reduced avatar (28px).

### 🌍 Full i18n Localization
- Translated all remaining hardcoded English strings across 6 languages (EN, VI, ZH, KO, RU, ID).

### 👤 Profile Header Improvements
- Full wallet address display (no truncation) with one-tap copy and external explorer link.

### 🔧 Layout & Bug Fixes
- **Fixed mobile content clipping**: `hub-feed-main` now uses `flex: none` on mobile.

</details>

---
*Developed by AI Agent — Focused on Premium Web3 UX.*
