import type { AISurface } from "../contracts";
const routes: Array<[string,AISurface]>=[["/collection","collection"],["/gamefi","gamefi"],["/defi","defi"]];
export function surfaceForPath(pathname:string):AISurface|null { const path=pathname.split(/[?#]/,1)[0].replace(/\/+$/,"/"); if(path==="/") return "landing"; for(const [prefix,surface] of routes) if(path===prefix || path.startsWith(prefix+"/")) return surface; return null; }
export function resolveContext(pathname:string, claimed:AISurface){ const surface=surfaceForPath(pathname); if(!surface) throw new Error("Unsupported pathname"); if(surface!==claimed) throw new Error("Context mismatch"); return Object.freeze({surface,pathname}); }
export function routeContext(context:{pathname:string;surface:AISurface}){return resolveContext(context.pathname,context.surface);}
