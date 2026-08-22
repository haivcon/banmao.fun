#!/usr/bin/env node

const baseURL = process.env.RESPONSIVE_AUDIT_URL || "http://127.0.0.1:3000";
const viewports = [
  [320, 568], [360, 800], [390, 844], [412, 915], [600, 960], [768, 1024],
  [1024, 768], [1280, 800], [1440, 900], [1920, 1080], [2560, 1440],
];
const routes = (process.env.RESPONSIVE_AUDIT_ROUTES || [
  "/", "/gamefi", "/gamefi/banmaorps", "/gamefi/banmaosnake",
  "/gamefi/banmaoslots", "/gamefi/banmaofomo", "/gamefi/banmaopk",
  "/defi", "/defi/staking", "/defi/burn", "/defi/airdrop", "/defi/box", "/collection",
].join(",")).split(",").map((route) => route.trim()).filter(Boolean);

async function loadChromium() {
  for (const moduleName of ["playwright", "playwright-core"]) {
    try {
      const playwrightPackage = await import(moduleName);
      return playwrightPackage.chromium;
    } catch (error) {
      if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
    }
  }
  throw new Error("Responsive audit requires Playwright. Install with: npm i -D playwright && npx playwright install chromium");
}

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();

    for (const route of routes) {
      const url = new URL(route, baseURL).toString();
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await page.waitForTimeout(500);
        const result = await page.evaluate(() => {
          const viewportTags = [...document.querySelectorAll('meta[name="viewport"]')].map((tag) => tag.getAttribute("content") || "");
          const root = document.documentElement;
          const body = document.body;
          const overflow = Math.max(root.scrollWidth, body.scrollWidth) - root.clientWidth;
          return {
            viewportTags,
            overflow,
            profile: root.dataset.bmAppGroup,
            mode: root.dataset.bmDisplayMode,
            width: root.clientWidth,
          };
        });
        const viewport = result.viewportTags[0] || "";
        if (result.viewportTags.length !== 1) failures.push(`${route} ${width}x${height}: expected one viewport meta, got ${result.viewportTags.length}`);
        const expectedWidth = result.mode === "desktop-canvas" ? /width=1280/i : /width=device-width/i;
        const validInitialScale = result.mode === "desktop-canvas" || /initial-scale=1(?:\.0+)?(?:,|$)/i.test(viewport);
        if (!expectedWidth.test(viewport) || !validInitialScale) failures.push(`${route} ${width}x${height}: invalid ${result.mode || "unknown"} viewport '${viewport}'`);
        if (/user-scalable=no|maximum-scale=1(?:\.0+)?(?:,|$)/i.test(viewport)) failures.push(`${route} ${width}x${height}: browser zoom is disabled`);
        if (result.overflow > 2) failures.push(`${route} ${width}x${height}: document overflows by ${result.overflow}px`);
        if (!result.profile || !result.mode) failures.push(`${route} ${width}x${height}: display route profile was not applied`);
        process.stdout.write(`PASS ${route} ${width}x${height} [${result.profile}/${result.mode}]\n`);
      } catch (error) {
        failures.push(`${route} ${width}x${height}: ${error.message}`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\nResponsive audit failed (${failures.length}):\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`\nResponsive audit passed: ${routes.length} routes × ${viewports.length} viewports.`);
}
