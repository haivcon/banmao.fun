# Game Assets

Static assets used by GameFi routes are grouped by game:

```text
public/games/
├── fomo/    # FOMO icon and preview
├── rps/     # RPS artwork, PWA icons, and preview
├── slots/   # Slots artwork, PWA icons, and preview
└── snake/   # Snake PWA icons and preview
```

## Conventions

- Reference files from application code with root-relative URLs such as `/games/rps/rock.png`.
- Preserve existing filenames when they are referenced by manifests or cached service-worker entries.
- Optimize images and video before committing them.
- Provide standard and maskable PWA icons where a game is installable.
- Do not preload another game’s large media from the landing page.
- Update the relevant manifest and service-worker cache list when adding or renaming install assets.
