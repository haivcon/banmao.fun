import { utils } from 'ethers';

/** Preserve the original UTF-8 bytes for metadata comparison and downloads. */
export function contractSvgImage(svg: string): string {
  if (!/^<svg\s/.test(svg) || !/<\/svg>\s*$/.test(svg)) throw new Error('Invalid contract SVG');
  return 'data:image/svg+xml;base64,' + utils.base64.encode(utils.toUtf8Bytes(svg));
}


/** Only use as srcDoc of an iframe with sandbox="" (no scripts or same-origin).
 * A document context lets nested SVG images animate; an outer <img> does not.
 * CSP blocks remote resources, scripts, forms and embedded documents. The SVG
 * is untrusted, so never insert this document into the application's own DOM.
 */
export function contractSvgDocument(svg: string): string {
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-src 'none'; object-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}body>svg{display:block;width:100%;height:100%}</style></head><body>${svg}</body></html>`;
}
