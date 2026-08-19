import * as fs from "node:fs";
import * as path from "node:path";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("BanmaoBox hydration determinism", () => {
  test("the server and first client render share a fixed clock value", () => {
    const page = read("app/defi/box/page.tsx");
    expect(page).toContain("const [now, setNow] = useState(0)");
    expect(page).not.toContain("useState(() => Date.now())");
    expect(page).toMatch(/useEffect\(\(\) => \{\s*setNow\(Date\.now\(\)\);/);
  });
});

describe("BanmaoBox bounded read-only loading", () => {
  test("Box gallery times out, localizes the explanation, cancels timers and retries reads only", () => {
    const page = read("app/defi/box/page.tsx");
    const hook = read("app/defi/box/useBoundedLoading.ts");
    const copy = read("app/defi/box/i18n/index.ts");

    expect(page).toContain("boxesTimedOut");
    expect(page).toContain("copy.loadingTimedOut");
    expect(page).toContain("retryBoxes");
    expect(hook).toContain("window.clearTimeout(timer)");
    expect(copy.match(/loadingTimedOut:/g)).toHaveLength(7);
    const retryHandler = page.slice(
      page.indexOf("const retryBoxes = useCallback"),
      page.indexOf("const parsedAmount"),
    );
    expect(retryHandler).toContain("retryBoxReads()");
    expect(retryHandler).not.toMatch(/writeContract|createBox|openBox|transferBox/);
  });

  test("admin deployment loading times out with a safe read-only retry", () => {
    const admin = read("app/defi/box/admin/page.tsx");
    expect(admin).toContain("deploymentTimedOut");
    expect(admin).toContain("Deployment data is taking longer than expected");
    expect(admin).toContain("retryDeployment");
    expect(admin).not.toMatch(/retryDeployment[\s\S]{0,300}(writeContract|createCollection|sendTransaction)/);
  });
});

describe("parent DeFi loading boundary", () => {
  test("transitions to an accessible bounded timeout with a read-only retry", () => {
    const loading = read("app/defi/loading.tsx");

    expect(loading).toContain("window.setTimeout");
    expect(loading).toContain("window.clearTimeout(timer)");
    expect(loading).toContain("12000");
    expect(loading).toContain('role="alert"');
    expect(loading).toContain("window.location.reload()");
    expect(loading).toContain("Your wallet");
    expect(loading).not.toMatch(/writeContract|sendTransaction|switchChain|connectAsync/);
  });
});

describe("WalletConnect canonical metadata", () => {
  test("uses the canonical www origin for URL, icon and redirect", () => {
    const walletConfig = read("app/lib/walletConfig.ts");
    expect(walletConfig).not.toContain('"https://banmao.fun');
    expect(walletConfig.match(/https:\/\/www\.banmao\.fun/g)).toHaveLength(3);
  });
});
