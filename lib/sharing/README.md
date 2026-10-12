# Project sharing

`content.ts` is the English source of truth for public project introductions. Each entry supplies the preview title, description, and default editable share copy. URLs use the existing production metadata origin, `https://banmao.fun`.

`metadata.ts` builds Next.js metadata with an Open Graph website preview and a Twitter `summary_large_image` card. `SHARING_IMAGE` remains the home/admin fallback (`public/social/banmao-introduction-v1.png`). `SHARING_IMAGES` maps 17 route families to versioned static PNGs, each opaque, 1200×630 and below 300 KB, with absolute URLs, MIME type and page-specific alt text. `createPreviewMetadata(url, title, description, image)` supports routes outside the share-control registry; `createSharingMetadata(route)` selects the registered project's artwork automatically. Registered project routes retain their own titles and descriptions. PWA icons and manifests are independent and remain intact.

The opaque PNG uses the existing banana-cat artwork, Orbitron/Rajdhani fonts, a purple background, and yellow accents. Generous outer margins accommodate typical landscape crops; arbitrary square crops may not retain the full composition. The image is served directly without runtime generation. Use a new versioned filename when replacing it and update `SHARING_IMAGE` to avoid stale image caches.

The shared client control in `components/sharing/ShareProject.tsx` appears only on exact routes registered in `content.ts`. It intentionally shares the project URL, not the current query string, wallet state, hash, or individual NFT selection. Existing media, community-post, and NFT sharing actions remain separate.

## Adding a project

1. Add its route, English title, and accurate description to `sharingPages`.
2. Spread `createSharingMetadata(route)` into that route's server page/layout metadata. Preserve its viewport, icons, manifest, and robots settings.
3. Verify the route's rendered HTML, including any nested metadata overrides.

The gallery retains image previews when a specifically requested media item resolves. Without a matching image, it uses the branded gallery introduction.

Hub, Explorer and Launchpad have preview artwork without entries in the share-control registry. Explorer details intentionally share the Explorer family image but generate an address-specific `og:url`. Launchpad preserves its development-only gate, robots restrictions, keywords and viewport.

The 16 additional images use the existing page artwork and Orbitron/Rajdhani fonts with text on the left, artwork on the right and route-specific accents. Local regeneration uses `.tmp/scripts/generate-sharing-images.cjs`; its contact sheet and source manifest stay under `.tmp/`. Only finished PNG assets belong in `public/social/`. Update the versioned filename and route mapping when replacing an image. Add artwork to `SHARING_IMAGES` when registering a new sharing route.

## Validation and release

Local tests: `npx jest __tests__/sharing.test.ts --runInBand` (tests are intentionally local-only).

Check rendered `og:title`, `og:description`, `og:url`, and `twitter:card` using a social-crawler user agent. Project routes should emit the branded `og:image` and `twitter:image`, image dimensions/alt text, and a `summary_large_image` card; actual shared media retains its own preview. Confirm the public image returns HTTP 200 and `image/png` after deployment. Check convention-based `opengraph-image` / `twitter-image` files when adding routes, since they can override configured images. Check desktop/mobile dialog layout, keyboard focus/Escape, edited copy, clipboard denial, native-share cancellation, and route changes.

After deployment, request a fresh scrape using the target platform's link debugger where available. Existing previews may remain cached. Platforms control whether descriptions, images, or thumbnails appear; omitting an image does not guarantee a text-only card. Metadata does not prefill a post: visitors must use the copy/share actions for introduction text.
