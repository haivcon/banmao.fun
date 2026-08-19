import {
  getFloatingPanelPosition,
  keyboardFloatingPosition,
  type FloatingBounds,
  type FloatingRect,
} from "../../app/components/ai/floatingPosition";

const viewport = {
  width: 1440,
  height: 900,
  offsetLeft: 0,
  offsetTop: 0,
  inset: 12,
  topReserved: 76,
  bottomReserved: 68,
  gap: 12,
};
const panel = { width: 460, height: 700 };
const launcherSize = { width: 210, height: 64 };

function launcher(x: number, y: number): FloatingRect {
  return { x, y, ...launcherSize };
}

describe("floating BANMAO AI panel positioning", () => {
  test.each([
    ["top-left", launcher(12, 76), { side: "right", left: 234, top: 76 }],
    ["top-right", launcher(1218, 76), { side: "left", left: 746, top: 76 }],
    ["bottom-left", launcher(12, 768), { side: "right", left: 234, top: 132 }],
    ["bottom-right", launcher(1218, 768), { side: "left", left: 746, top: 132 }],
  ] as const)("keeps the panel adjacent and clamped at %s", (_name, anchor, expected) => {
    expect(getFloatingPanelPosition(anchor, panel, viewport, false)).toEqual(expected);
  });

  test("uses the launcher's viewport half at the center and stays in bounds", () => {
    expect(getFloatingPanelPosition(launcher(615, 418), panel, viewport, false)).toEqual({
      side: "left",
      left: 143,
      top: 132,
    });
  });

  test("clamps a tall panel in a constrained short viewport above bottom navigation", () => {
    const result = getFloatingPanelPosition(
      { x: 500, y: 260, width: 180, height: 64 },
      { width: 460, height: 270 },
      { ...viewport, width: 900, height: 420, bottomReserved: 74 },
      false,
    );
    expect(result).toEqual({ side: "left", left: 28, top: 76 });
    expect(result!.top + 270).toBeLessThanOrEqual(420 - 74);
  });

  test("reclamps after viewport resize", () => {
    const anchor = launcher(1218, 768);
    expect(getFloatingPanelPosition(anchor, panel, viewport, false)).toEqual({ side: "left", left: 746, top: 132 });
    expect(getFloatingPanelPosition(launcher(546, 892), panel, { ...viewport, width: 768, height: 1024 }, false)).toEqual({
      side: "left",
      left: 74,
      top: 256,
    });
  });

  test("keyboard movement produces geometry consumed by the panel", () => {
    const bounds: FloatingBounds = {
      viewportWidth: 1440,
      viewportHeight: 900,
      controlWidth: 210,
      controlHeight: 64,
      inset: 12,
      topReserved: 76,
      bottomReserved: 68,
    };
    const moved = keyboardFloatingPosition({ x: 1218, y: 768 }, "ArrowLeft", bounds, true);
    expect(moved).toEqual({ x: 1170, y: 768 });
    expect(getFloatingPanelPosition({ ...moved, ...launcherSize }, panel, viewport, false)).toEqual({
      side: "left",
      left: 698,
      top: 132,
    });
  });

  test("mobile bypasses floating panel coordinates", () => {
    expect(getFloatingPanelPosition(launcher(300, 760), panel, { ...viewport, width: 390, height: 844 }, true)).toBeUndefined();
  });
});
