import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import manifest from "../app/manifest";

const CANONICAL_LOGO = "/pwa/main/icon-512x512.png";

function readSource(path: string): string {
    return readFileSync(join(process.cwd(), path), "utf8");
}

describe("root PWA manifest", () => {
    test("defines the installable BANMAO app metadata", () => {
        const value = manifest();

        expect(value).toMatchObject({
            name: "BANMAO — XLayer Gaming Ecosystem",
            short_name: "BANMAO",
            description: expect.any(String),
            start_url: "/",
            display: "standalone",
            background_color: "#000000",
            theme_color: "#a855f7",
        });
        expect(value.description).not.toHaveLength(0);
    });

    test("references only existing public icon assets", () => {
        const icons = manifest().icons ?? [];

        expect(icons.length).toBeGreaterThan(0);
        for (const icon of icons) {
            expect(icon.src).toMatch(/^\//);
            expect(existsSync(join(process.cwd(), "public", icon.src.slice(1)))).toBe(true);
        }
    });

    test("uses the canonical logo in root brand surfaces", () => {
        const rootIcons = manifest().icons ?? [];
        const web2d = readSource("app/web2d/Web2DLanding.tsx");
        const layout = readSource("app/layout.tsx");
        const splash = readSource("components/SplashScreen.tsx");

        expect(rootIcons.some((icon) => icon.src === CANONICAL_LOGO)).toBe(true);
        expect(web2d).toContain(`src="${CANONICAL_LOGO}"`);
        expect(layout).toContain(`url: "${CANONICAL_LOGO}"`);
        expect(layout).toContain(`images: ["${CANONICAL_LOGO}"]`);
        expect(splash).toContain(`src="${CANONICAL_LOGO}"`);
        expect([web2d, layout, splash].join("\n")).not.toMatch(/branding\/(?:animated-icon\.gif|banmao_logo\.png)/);
    });

    test("mobile Web2D exposes one tab navigation without a fixed content overlay", () => {
        const web2d = readSource("app/web2d/Web2DLanding.tsx");
        const styles = readSource("app/web2d/web2d.css");

        expect(web2d.match(/role="tablist"/g)).toHaveLength(1);
        expect(web2d).not.toContain("web2d-mobile-nav");
        expect(styles).not.toContain(".web2d-mobile-nav");
        expect(styles).not.toMatch(/\.web2d\s*\{[\s\S]*?padding-bottom:\s*calc\(80px/);
    });
});
