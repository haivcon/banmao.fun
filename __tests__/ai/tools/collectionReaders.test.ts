import {
  readCollectionPrompts,
  readCollectionQuests,
  readCollectionSearch,
} from "../../../lib/collection/server/readers";

const cloudinaryUrl = "cloudinary:" + "//123456:test-credential@demo-cloud";
const resource = {
  public_id: "banmao/cute_cat",
  secure_url: "https://res.cloudinary.com/demo-cloud/image/upload/banmao/cute_cat.png",
  asset_folder: "banmao",
  format: "png",
  resource_type: "image",
  width: 100,
  height: 50,
  bytes: 123,
  created_at: "2026-08-11T00:00:00Z",
};

test("collection search preserves deterministic fuzzy scoring and bounded results", async () => {
  const fetcher = jest.fn<Promise<Response>, [string | URL | Request]>(async () => new Response(JSON.stringify({ resources: [resource] }), { status: 200 }));
  const result = await readCollectionSearch(
    { query: "cute cat", folder: "banmao", limit: 1 },
    { cloudinaryUrl, fetch: fetcher },
  );

  expect(result).toMatchObject({ total: 1, query: "cute cat", source: "cloudinary:collection-search", observedAt: expect.any(String), results: [{ public_id: resource.public_id, score: expect.any(Number) }] });
  expect(result.results[0].score).toBeGreaterThan(0);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toBe("https://api.cloudinary.com/v1_1/demo-cloud/resources/search");
});

test("collection readers reject invalid bounded arguments", async () => {
  await expect(readCollectionSearch({ query: "cat", folder: "../secret", limit: 10 }, { cloudinaryUrl, fetch: jest.fn() })).rejects.toThrow();
  await expect(readCollectionPrompts({ folder: "https://evil.test/x", limit: 10 }, { cloudinaryUrl, fetch: jest.fn() })).rejects.toThrow();
  await expect(readCollectionQuests({ wallet: "not-a-wallet" }, { execute: jest.fn() })).rejects.toThrow();
});

test("collection prompts only fetches allowlisted bounded Cloudinary raw files", async () => {
  const fetcher = jest.fn(async (url: string | URL | Request) => {
    const value = String(url);
    if (value.includes("resources/search")) {
      return new Response(JSON.stringify({ resources: [
        { public_id: "banmao/a_prompt/prompt", secure_url: "https://res.cloudinary.com/demo-cloud/raw/upload/banmao/a_prompt/prompt.txt" },
        { public_id: "banmao/a_prompt/share_links", secure_url: "https://evil.test/share_links.txt" },
      ] }), { status: 200 });
    }
    return new Response('[{"id":1,"prompt":"cute cat","share_link":"https://gemini.google.com/share/abc"}]', { status: 200 });
  });

  const result = await readCollectionPrompts({ folder: "banmao", limit: 10 }, { cloudinaryUrl, fetch: fetcher });
  expect(result).toMatchObject({ folder: "banmao", hasPrompts: true, source: "cloudinary:collection-prompts", observedAt: expect.any(String), prompts: [{ id: 1, prompt: "cute cat" }] });
  expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual(expect.arrayContaining([
    "https://api.cloudinary.com/v1_1/demo-cloud/resources/search",
    "https://res.cloudinary.com/demo-cloud/raw/upload/banmao/a_prompt/prompt.txt",
  ]));
  expect(fetcher.mock.calls.some(([url]) => String(url).includes("evil.test"))).toBe(false);
  expect(fetcher.mock.calls.some(([url]) => String(url).startsWith("/api/"))).toBe(false);
});

test("collection quests executes only bounded SELECT reads", async () => {
  const execute = jest.fn<Promise<{ rows: Array<Record<string, unknown>> }>, [{ sql: string; args: Array<string | number> }]>(async () => ({ rows: [{ cnt: 2, max_streak: 4 }] }));
  const result = await readCollectionQuests(
    { wallet: "0x0000000000000000000000000000000000000001", now: new Date("2026-08-11T12:00:00Z") },
    { execute },
  );

  expect(result).toMatchObject({ source: "internal-db:hub-quests", observedAt: expect.any(String) });
  expect(result.quests).toHaveLength(8);
  expect(result.quests.find((quest) => quest.id === "post_today")).toMatchObject({ progress: 1, completed: true });
  expect(execute).toHaveBeenCalledTimes(8);
  for (const [{ sql }] of execute.mock.calls) expect(sql.trim().toUpperCase().startsWith("SELECT ")).toBe(true);
  expect(execute.mock.calls.some(([query]) => /^\s*(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(query.sql))).toBe(false);
});

test("Cloudinary readers fail when shared configuration is missing", async () => {
  await expect(readCollectionSearch({ query: "cat", folder: "banmao", limit: 10 }, { cloudinaryUrl: "", fetch: jest.fn() })).rejects.toThrow("CLOUDINARY_URL");
  await expect(readCollectionPrompts({ folder: "banmao", limit: 10 }, { cloudinaryUrl: "", fetch: jest.fn() })).rejects.toThrow("CLOUDINARY_URL");
});
