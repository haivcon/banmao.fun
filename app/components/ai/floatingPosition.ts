export type FloatingPoint = { x: number; y: number };
export type NormalizedFloatingPoint = { x: number; y: number };
export type FloatingRect = FloatingPoint & { width: number; height: number };
export type FloatingPanelPosition = { left: number; top: number; side: "left" | "right" };
export type FloatingPanelViewport = {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
  inset: number;
  topReserved: number;
  bottomReserved: number;
  gap: number;
};
export type FloatingBounds = {
  viewportWidth: number;
  viewportHeight: number;
  controlWidth: number;
  controlHeight: number;
  inset: number;
  topReserved: number;
  bottomReserved: number;
};

function ranges(bounds: FloatingBounds) {
  const minX = bounds.inset;
  const minY = Math.max(bounds.inset, bounds.topReserved);
  return {
    minX,
    minY,
    maxX: Math.max(minX, bounds.viewportWidth - bounds.controlWidth - bounds.inset),
    maxY: Math.max(minY, bounds.viewportHeight - bounds.controlHeight - bounds.bottomReserved),
  };
}

export function clampFloatingPosition(
  position: FloatingPoint | NormalizedFloatingPoint,
  bounds: FloatingBounds,
  normalized = false,
): FloatingPoint {
  const { minX, minY, maxX, maxY } = ranges(bounds);
  const x = normalized ? minX + position.x * (maxX - minX) : position.x;
  const y = normalized ? minY + position.y * (maxY - minY) : position.y;
  return {
    x: Math.min(maxX, Math.max(minX, Math.round(x))),
    y: Math.min(maxY, Math.max(minY, Math.round(y))),
  };
}

export function normalizeFloatingPosition(
  position: FloatingPoint,
  bounds: FloatingBounds,
): NormalizedFloatingPoint {
  const { minX, minY, maxX, maxY } = ranges(bounds);
  return {
    x: maxX === minX ? 0 : Number(((position.x - minX) / (maxX - minX)).toFixed(4)),
    y: maxY === minY ? 0 : Number(((position.y - minY) / (maxY - minY)).toFixed(4)),
  };
}

export function getFloatingPanelPosition(
  launcher: FloatingRect,
  panel: { width: number; height: number },
  viewport: FloatingPanelViewport,
  mobile: boolean,
): FloatingPanelPosition | undefined {
  if (mobile) return undefined;
  const minX = viewport.offsetLeft + viewport.inset;
  const minY = Math.max(viewport.offsetTop + viewport.inset, viewport.offsetTop + viewport.topReserved);
  const maxX = Math.max(minX, viewport.offsetLeft + viewport.width - panel.width - viewport.inset);
  const maxY = Math.max(minY, viewport.offsetTop + viewport.height - panel.height - viewport.bottomReserved);
  const side = launcher.x + launcher.width / 2 >= viewport.offsetLeft + viewport.width / 2 ? "left" : "right";
  const requestedX = side === "left" ? launcher.x - panel.width - viewport.gap : launcher.x + launcher.width + viewport.gap;
  const spaceAbove = launcher.y - minY;
  const spaceBelow = viewport.offsetTop + viewport.height - viewport.bottomReserved - (launcher.y + launcher.height);
  const requestedY = spaceAbove >= spaceBelow ? launcher.y + launcher.height - panel.height : launcher.y;
  return {
    side,
    left: Math.min(maxX, Math.max(minX, Math.round(requestedX))),
    top: Math.min(maxY, Math.max(minY, Math.round(requestedY))),
  };
}

export function keyboardFloatingPosition(
  position: FloatingPoint,
  key: string,
  bounds: FloatingBounds,
  largeStep = false,
): FloatingPoint {
  const step = largeStep ? 48 : 12;
  const { minX, minY, maxX, maxY } = ranges(bounds);
  if (key === "Home") return { x: minX, y: minY };
  if (key === "End") return { x: maxX, y: maxY };
  const delta = {
    ArrowLeft: { x: -step, y: 0 },
    ArrowRight: { x: step, y: 0 },
    ArrowUp: { x: 0, y: -step },
    ArrowDown: { x: 0, y: step },
  }[key];
  return delta
    ? clampFloatingPosition({ x: position.x + delta.x, y: position.y + delta.y }, bounds)
    : position;
}
