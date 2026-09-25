# Project sharing

`content.ts` is the English source of truth for public project introductions. Each entry supplies the preview title, description, and default editable share copy. URLs use the existing production metadata origin, `https://banmao.fun`.

`metadata.ts` builds Next.js metadata with an Open Graph website preview and a Twitter summary card. Explicit empty image arrays replace inherited generic preview images. PWA icons and manifests are independent and must remain intact.

The shared client control in `components/sharing/ShareProject.tsx` appears only on exact routes registered in `content.ts`. It intentionally shares the project URL, not the current query string, wallet state, hash, or individual NFT selection. Existing media, community-post, and NFT sharing actions remain separate.

## Adding a project

1. Add its route, English title, and accurate description to `sharingPages`.
2. Spread `createSharingMetadata(route)` into that route's server page/layout metadata. Preserve its viewport, icons, manifest, and robots settings.
3. Verify the route's rendered HTML, including any nested metadata overrides.

The gallery retains image previews when a specifically requested media item resolves. Without a matching image, it uses the text-first gallery introduction instead of a generic logo.

## Validation and release

Local tests: `npx jest __tests__/sharing.test.ts --runInBand` (tests are intentionally local-only).

Check rendered `og:title`, `og:description`, `og:url`, and `twitter:card` using a social-crawler user agent. Generic project routes should not emit `og:image` or `twitter:image`; actual shared media may emit them. Check desktop/mobile dialog layout, keyboard focus/Escape, edited copy, clipboard denial, native-share cancellation, and route changes.

After deployment, request a fresh scrape using the target platform's link debugger where available. Existing previews may remain cached. Platforms control whether descriptions, images, or thumbnails appear; omitting an image does not guarantee a text-only card. Metadata does not prefill a post: visitors must use the copy/share actions for introduction text.
