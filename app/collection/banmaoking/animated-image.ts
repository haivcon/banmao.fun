// Keep the NFT in an isolated SVG image context (never inject metadata as HTML).
// Validate animated artwork without modifying the on-chain image payload.
export function animatedKingImage(image: string): string {
  const prefix = "data:image/svg+xml;base64,";
  if (!image.startsWith(prefix)) throw new Error("Expected an on-chain SVG image");
  const svg = atob(image.slice(prefix.length));
  if (!/^<svg\s/.test(svg) || !/<animate(?:Transform|Motion)?\s/.test(svg)) {
    throw new Error("On-chain SVG is missing animation");
  }
  return image;
}
