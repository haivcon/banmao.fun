# Web2D Landing Page

`app/web2d` provides a lightweight alternative to the Web3D landing experience. It is used when WebGL is unavailable, when reduced motion is preferred, or when the application selects a simpler presentation.

## Files

- `Web2DLanding.tsx`: accessible landing-page structure and navigation
- `web2d.css`: responsive layout, theme, and motion styles
- `README.md`: maintenance notes

## Requirements

- Keep primary navigation equivalent to the 3D landing page.
- Use semantic HTML and keyboard-accessible controls.
- Respect `prefers-reduced-motion`.
- Avoid Three.js and other WebGL-only dependencies.
- Keep mobile controls clear of safe-area insets.
- Test narrow screens, landscape orientation, keyboard navigation, and screen readers.

When adding a primary action to Web3D, add or verify its Web2D equivalent in the same change.
