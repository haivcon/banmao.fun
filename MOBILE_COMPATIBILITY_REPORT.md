# Mobile Compatibility Review

This document records mobile layout risks identified in the GameFi interface. Treat line numbers and historical observations as review context; verify every issue against the current CSS before changing code.

## Target devices

Test at least these viewport widths:

- 320 px: iPhone SE and similarly narrow devices
- 360 px: compact Android devices
- 375 px: iPhone X/12 class devices
- 390–430 px: common modern phones

## Findings

### GameFi Hub

Review `gamefi-hub.css` for:

- language controls with fixed or large minimum widths;
- game cards without a narrow-screen breakpoint;
- modal padding that can exceed the available width.

### Banmao RPS

Review `banmaorps/globals.css` for:

- `.rooms-table` using a large `min-width`;
- `.leaderboard-sidebar` using a fixed width without `max-width: 100%`;
- `.rps-choice` cards whose minimum width prevents a three-item row from fitting.

Wide data tables may scroll horizontally, but their wrapper must contain the overflow and preserve touch scrolling. Do not hide required table content globally.

### Banmao Snake

The dedicated responsive stylesheet already uses breakpoints, fluid typography, and bounded panels. Recheck D-pad controls at 320 px; fixed 77 px buttons may consume too much space.

## Recommended patterns

### Narrow-screen breakpoint

```css
@media (max-width: 359px) {
  .gamefi-hub__container {
    padding: 12px 8px;
  }

  .gamefi-lang-dropdown {
    min-width: 140px;
  }

  .game-card {
    padding: 12px;
  }
}
```

### Scrollable tables

```css
.rooms-table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 640px) {
  .rooms-table th,
  .rooms-table td {
    padding: 8px 6px;
    font-size: 11px;
    white-space: nowrap;
  }
}
```

### Bounded sidebars and controls

```css
.leaderboard-sidebar {
  width: 320px;
  max-width: 100%;
}

@media (max-width: 768px) {
  .leaderboard-sidebar {
    width: 100%;
  }
}

@media (max-width: 359px) {
  .dpad-mobile button {
    width: 60px !important;
    height: 60px !important;
    font-size: 26px !important;
  }
}
```

Avoid applying `overflow-x: hidden` as a substitute for fixing an overflowing component; it can make content inaccessible. Prefer fluid dimensions, `max-width: 100%`, `clamp()`, and component-level overflow handling.

## Verification checklist

1. Open Chrome or Edge DevTools and test each target width.
2. Check GameFi cards, language controls, and information modals.
3. Check RPS tables, choice cards, and leaderboard panels.
4. Check Snake canvas, panels, and D-pad controls.
5. Test touch scrolling, orientation changes, keyboard focus, and safe-area insets.
6. Repeat critical flows on physical iOS and Android devices or a device-testing service.
