// Keep the NFT in an isolated SVG image context (never inject metadata as HTML).
// This presentation-only override does not modify the immutable on-chain tokenURI.
export function animatedKingImage(image: string): string {
  const prefix = "data:image/svg+xml;base64,";
  if (!image.startsWith(prefix)) throw new Error("Expected an on-chain SVG image");
  const svg = atob(image.slice(prefix.length));
  if (!/^<svg\s/.test(svg) || !/<animate(?:Transform)?\s/.test(svg)) {
    throw new Error("On-chain SVG is missing animation");
  }
  const animated = svg.replace(/^<svg\b[^>]*>/, root =>
    root.replace(/\sdata-motion-override="[^"]*"/g, "").replace("<svg", '<svg data-motion-override="true"'),
  );
  return prefix + btoa(animated);
}
