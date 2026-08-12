import { existsSync } from "node:fs";
import { join } from "node:path";

import manifest from "../app/manifest";

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
});
