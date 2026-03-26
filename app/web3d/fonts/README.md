# Font Files Directory

Place your font files here for use in 3D elements.

## Supported Font Formats
- `.woff` (recommended for web)
- `.woff2` (better compression)
- `.ttf` (TrueType)

## Recommended Fonts
1. **Space Mono** - Monospace, tech/code style
2. **Orbitron** - Futuristic headings
3. **Rajdhani** - Modern UI text
4. **Chakra Petch** - Gaming style

## How to Add Fonts

1. Download font files from Google Fonts or other sources
2. Place `.woff` files in this folder
3. Update `index.ts` to point to your font files:

```typescript
export const SPACE_MONO: FontConfig = {
    name: 'Space Mono',
    path: '/fonts/SpaceMono-Regular.woff', // Update this path
    fallback: 'monospace',
};
```

4. Copy font files to `public/fonts/` folder as well

## Download Links
- [Space Mono](https://fonts.google.com/specimen/Space+Mono)
- [Orbitron](https://fonts.google.com/specimen/Orbitron)
- [Rajdhani](https://fonts.google.com/specimen/Rajdhani)
- [Chakra Petch](https://fonts.google.com/specimen/Chakra+Petch)
