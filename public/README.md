# Public Assets

Files under `public` are served from the site root. For example, `public/branding/logo.png` is referenced as `/branding/logo.png`.

## Layout

- `branding/`: project logos and brand artwork
- `defi/`: DeFi feature assets
- `flags/`: locale and language icons
- `fonts/`: web fonts
- `gamefi/` and `games/`: game artwork, previews, and install icons
- `icons/` and `ui/`: shared controls and interface artwork
- `images/`: general feature imagery
- `mascots/` and `models/`: character art and 3D models
- `pwa/`: shared install assets
- `sounds/`: interface and game audio
- `manifest-*.json`: PWA manifests
- `sw.js`: service worker

## Guidelines

- Use root-relative URLs in application code.
- Keep filenames stable when referenced by manifests or service-worker caches.
- Use lowercase, descriptive filenames for new assets unless an integration requires another format.
- Compress raster images, audio, video, and 3D models before committing.
- Do not place secrets, source design files, archives, or temporary exports here.
- Confirm licensing and attribution requirements for third-party assets.
- Avoid preloading route-specific media globally.
- Update manifests, metadata, and `sw.js` whenever an install asset changes.

See [`games/README.md`](games/README.md) for game-specific conventions and [`../WEB3D_PERFORMANCE_BUDGET.md`](../WEB3D_PERFORMANCE_BUDGET.md) for Web3D limits.
