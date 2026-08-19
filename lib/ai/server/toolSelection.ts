import type { AISurface, DeFiApp } from "../contracts";
import type { ToolDescriptor } from "./toolRegistry";

const DEFI_APP_TOOLS: Record<DeFiApp, ReadonlySet<string>> = {
  overview: new Set(["docs.search", "defi.portfolio"]),
  staking: new Set(["docs.search", "defi.staking", "defi.portfolio"]),
  burn: new Set(["docs.search", "defi.burn"]),
  airdrop: new Set(["docs.search", "defi.airdrop"]),
  box: new Set(["docs.search", "defi.box"]),
};

export function filterToolsForContext(tools: readonly ToolDescriptor[], context: { surface: AISurface; app?: DeFiApp }) {
  if (context.surface !== "defi" || !context.app) return tools.filter((tool) => tool.contexts.includes(context.surface));
  const allowed = DEFI_APP_TOOLS[context.app];
  return tools.filter((tool) => tool.contexts.includes("defi") && allowed.has(tool.name));
}
