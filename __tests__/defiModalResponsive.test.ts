import * as fs from "node:fs";
import * as path from "node:path";

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("Burn transaction and detail modals share viewport-safe mobile constraints", () => {
  const page = read("app/defi/burn/page.tsx");
  const css = read("app/defi/burn/burn.css");
  expect(page).toContain('className="burn-viewport-dialog burn-success-dialog"');
  expect(page).not.toContain('padding: "77px"');
  expect(css).toMatch(/\.burn-viewport-dialog,[\s\S]*max-height:\s*min\(85dvh,\s*760px\)/);
  expect(css).toMatch(/@media \(max-width: 768px\), \(max-height: 700px\)[\s\S]*align-items:\s*flex-end/);
  expect(css).toContain("env(safe-area-inset-bottom)");
});

test("Airdrop React and DOM-created dialogs use the same mobile constraints", () => {
  const panel = read("app/defi/airdrop/components/AirdropPanel.tsx");
  const helper = read("app/defi/airdrop/components/LegalRiskModal.ts");
  const css = read("app/defi/airdrop/airdrop.css");
  expect(panel).toContain('class="airdrop-viewport-dialog" role="dialog" aria-modal="true"');
  expect(helper).toContain('overlay.className = "airdrop-viewport-overlay"');
  expect(helper).toContain('class="airdrop-viewport-dialog" role="dialog" aria-modal="true"');
  expect(css).toMatch(/\.airdrop-guide-modal,[\s\S]*max-height:\s*min\(85dvh,\s*760px\)/);
  expect(css).toMatch(/\.airdrop-viewport-dialog #okx-addr-list[\s\S]*overscroll-behavior:\s*contain/);
  expect(css).toContain("env(safe-area-inset-bottom)");
});

test("Burn and Airdrop contextual toolbars stay in flow without covering content", () => {
  const shellCss = read("app/defi/defi-shell.css");
  const airdropCss = read("app/defi/airdrop/airdrop.css");
  const contextualRule = shellCss.match(/\.defi-app-shell :is\(\.burn-header, \.defi-airdrop-header, \.launchpad-header\) \{[^}]+\}/)?.[0] ?? "";

  expect(contextualRule).toMatch(/position:\s*relative\s*!important/);
  expect(contextualRule).toMatch(/top:\s*auto\s*!important/);
  expect(contextualRule).not.toMatch(/position:\s*sticky/);
  expect(airdropCss).toMatch(/\.airdrop-mobile-workspace-tabs\s*\{[\s\S]*?top:\s*calc\(var\(--defi-shell-header-height\) \+ 6px\)/);
  expect(airdropCss).not.toContain("top: calc(var(--defi-shell-header-height) + var(--defi-context-header-height) + 6px)");
});
