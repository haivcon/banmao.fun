# BANMAO AI Emotional Mascot Assets

Production-ready local composite assets for the BANMAO chat UI. All files in this directory are derived from the existing BANMAO sprite library; they are **not generative-AI images**.

## Provenance

- Source root: `/public/gamefi/banmaofomo/sprites/`
- Canonical animation mapping: `app/gamefi/banmaofomo/components/AnimatedBanMao.tsx`
- Operation: full-canvas RGBA resize with Pillow; semantic states use locally drawn alpha overlays.
- Source sprites are 1024×1024 RGBA PNG. Output keeps the entire source canvas, so ears, feet, effects, and props are not cropped.
- Canvas/pivot: 256×256, `object-fit: contain`, pivot `{ x: 0.5, y: 1.0 }`. Optional static hero poster: 384×384.
- No source files are modified or deleted.

## Integration

Load `/ai/mascot/mascot-manifest.json`, select `emotions[eventEmotion]`, then animate the listed WebP frames using `frameDurationMs`. Respect `loop`. For `prefers-reduced-motion: reduce`, render `fallback.src` only.

Recommended rendering:

```css
.banmao-ai-mascot {
  width: 256px;
  height: 256px;
  object-fit: contain;
  object-position: 50% 100%;
}
```

The 384px poster is useful for a header or hero, but it is static to avoid wasteful animation payloads. Do not upscale beyond the supplied dimensions unless the UI accepts soft raster scaling.

## Event mapping

| Emotion | Suggested events |
|---|---|
| `idle` | `chat.ready`, `response.complete` |
| `greeting` | `session.open`, `user.returned` |
| `listening` | `input.voice.start`, `input.focus` |
| `thinking` | `assistant.thinking` |
| `researching` | `tool.search.start`, `retrieval.start` |
| `working` | `tool.run.start`, `generation.start` |
| `answering` | `assistant.stream.start` |
| `success` | `task.success`, `transaction.confirmed` |
| `excited` | `reward.revealed`, `milestone` |
| `secure` | `security.verified`, `wallet.safe` |
| `warning` | `task.warning`, `confirmation.required` |
| `confused` | `intent.unclear`, `empty.result` |
| `error` | `task.error`, `network.error` |
| `sleeping` | `session.inactive`, `maintenance` |
| `love` | `user.like`, `community.love` |
| `goodbye` | `session.close`, `sign.out` |

## Preload and performance

- Eager: `idle`, `greeting`, `listening`, `thinking`, `answering`.
- Lazy-high: `researching`, `working`, `success`, `secure`, `warning`, `error`.
- Lazy: `excited`, `confused`, `sleeping`, `love`, `goodbye`.
- Preload each emotion's 256px poster first. Fetch its motion frames only when that state is likely or active.
- Total bytes and per-emotion bytes are machine-readable in `mascot-manifest.json`; full file metadata/checksums are in `qa-report.json`.
- No GIF is used as the runtime engine. The frame sequence is intentionally small (3–4 frames per emotion).

## Files

- `frames/<emotion>/frame-XX@256.webp`: animation frames with alpha.
- `frames/<emotion>/poster@256.webp`: static chat fallback and reduced-motion poster.
- `frames/<emotion>/poster@384.webp`: static header/hero poster.
- `overlays/*.webp`: reusable semantic overlays on transparent 256px canvases.
- `mascot-manifest.json`: runtime contract, timing, loop, fallback, dimensions, provenance, and preload policy.
- `contact-sheet.png`: labeled 4×4 visual QA sheet.
- `qa-report.json`: dimensions, format, alpha, size, SHA-256, and generation checks.
- `tools/generate_assets.py`: deterministic local build script.

## QA status

Automated QA passes for required emotion coverage, manifest reference existence, WebP format, alpha presence, dimensions, full-canvas/no-crop processing, consistent pivot, contact-sheet dimensions, and transparent output boundaries. The contact sheet was opened locally at its native 1280×1320 size. Automated visual interpretation was unavailable because this Hermes runtime has no configured vision provider; aesthetic judgment of silhouette, overlay readability, overlap, and alpha-edge appearance remains explicitly unverified in `qa-report.json`.

## Rebuild

From the repository root:

```bash
python public/ai/mascot/tools/generate_assets.py
```

The generator only creates or overwrites artifacts under `public/ai/mascot/`. It does not delete files.
