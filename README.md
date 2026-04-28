# Banmao Fun — Social Hub & DeFi Platform

## v0.2.0 — Mobile-First Hub Redesign

### 📱 Instagram-Style Mobile Experience
- **Floating Pill Bottom Navigation**: A capsule-shaped (`border-radius: 9999px`) glassmorphic navigation bar fixed at the bottom of the screen with 5 tabs: Home, Explore, Create (+), Quests, and Profile. Replaces the old FAB button and scattered mobile action buttons.
- **Compact Post Cards**: Post cards render edge-to-edge on mobile with reduced avatar (28px), smaller typography, and image height capped at `55vh` with `object-fit: cover` — mimicking the Instagram feed density.
- **Responsive Element Downsizing**: All Hub UI components (ProfileHeader, CreatorAnalytics, feed tabs, top creators, buttons) are systematically scaled down at `≤600px` breakpoint for a native mobile-app feel.

### 🌍 Full i18n Localization
- Translated all remaining hardcoded English strings across 6 languages (EN, VI, ZH, KO, RU, ID): Creator Analytics labels, period selectors (7D/30D/All), engagement metrics, daily check-in UI, quest system, and feed tab names.
- Added new translation keys: `activityThisWeek`, `engagementRate`, `tipsEarned`, `sevenDays`, `thirtyDays`, `allTime`, `explore`, `quests`, `home`, and more.

### 👤 Profile Header Improvements
- Full wallet address display (no truncation) with one-tap copy and external explorer link.
- Removed redundant theme toggle from profile view.
- Mobile-optimized banner height (100px), avatar (72px), and stat layout with `white-space: nowrap` labels.

### 🔧 Layout & Bug Fixes
- **Fixed mobile content clipping**: `hub-feed-main` now uses `flex: none` on mobile to prevent flex collapse that hid the Profile Header.
- **Fixed Quests panel**: Added a standalone `hub-bnav-quests-panel` that renders independently from the hidden `hub-mobile-actions-wrapper`, so the bottom nav Quests button works correctly.
- **Disabled header auto-hide on mobile**: `col-header-hidden { transform: none }` prevents the sticky header from sliding up and covering the action bar and create button.
- **Scroll-to-top repositioned**: `col-fab` is pushed above the pill nav bar so it's always accessible.
- **CSS cleanup**: Removed empty rulesets, fixed duplicate CSS blocks, and resolved all lint warnings.

---
*Developed by AI Agent — Focused on Premium Web3 UX.*
