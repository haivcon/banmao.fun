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
  const fetcher = jest.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ resources: [resource] }), { status: 200 }));
  const result = await readCollectionSearch(
    { query: "cute cat", folder: "banmao", limit: 1 },
    { cloudinaryUrl, fetch: fetcher },
  );

  expect(result).toMatchObject({ total: 1, query: "cute cat", source: "cloudinary:collection-search", observedAt: expect.any(String), results: [{ public_id: resource.public_id, score: expect.any(Number) }] });
  expect(result.results[0].score).toBeGreaterThan(0);
  expect(fetcher).toHaveBeenCalled();
  expect(fetcher.mock.calls[0][0]).toBe("https://api.cloudinary.com/v1_1/demo-cloud/resources/search");
  const expressions = fetcher.mock.calls.map((call) => JSON.parse(String(call[1]?.body)).expression as string);
  expect(expressions.join(" ")).toContain("public_id:*cute*");
  expect(expressions.join(" ")).toContain("tags=cute");
  expect(expressions.every((expression) => expression.startsWith("resource_type:image AND folder:banmao* AND ("))).toBe(true);
});

test("searches bounded expanded-term batches across the Cloudinary index and deduplicates candidates", async () => {
  const fetcher = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const expression = JSON.parse(String(init?.body)).expression as string;
    const resources = expression.includes("cyberpunk")
      ? [{ ...resource, public_id: "deep/Cyberpunk_Neon_Cat" }]
      : [{ ...resource, public_id: "deep/Cyberpunk_Neon_Cat" }, { ...resource, public_id: "deep/Other" }];
    return new Response(JSON.stringify({ resources }), { status: 200 });
  });

  const result = await readCollectionSearch({ query: "cyberpunk", limit: 10 }, { cloudinaryUrl, fetch: fetcher });
  const requests = fetcher.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
  expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(1);
  expect(fetcher.mock.calls.length).toBeLessThanOrEqual(3);
  expect(requests.every((request) => request.max_results === 100)).toBe(true);
  expect(requests.every((request) => typeof request.expression === "string" && !request.expression.includes("folder:banmao"))).toBe(true);
  expect(requests.map((request) => request.expression).join(" ")).toContain("public_id:*cyberpunk*");
  expect(requests.map((request) => request.expression).join(" ")).toContain("tags=cyberpunk");
  expect(result.results.map((item) => item.public_id)).toEqual(["deep/Cyberpunk_Neon_Cat"]);
});

test("falls back to bounded public_id index queries when metadata field syntax is rejected", async () => {
  const fetcher = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const expression = JSON.parse(String(init?.body)).expression as string;
    if (expression.includes("tags=") || expression.includes("context:")) return new Response("unsupported field", { status: 400 });
    return new Response(JSON.stringify({ resources: [{ ...resource, public_id: "archive/Happy_Smile" }] }), { status: 200 });
  });

  const result = await readCollectionSearch({ query: "vui", limit: 10 }, { cloudinaryUrl, fetch: fetcher });
  const expressions = fetcher.mock.calls.map((call) => JSON.parse(String(call[1]?.body)).expression as string);
  expect(expressions.some((expression) => expression.includes("tags=happy"))).toBe(true);
  expect(expressions.some((expression) => expression.includes("public_id:*happy*") && !expression.includes("tags=") && !expression.includes("context:"))).toBe(true);
  expect(expressions.every((expression) => !expression.includes("folder:banmao"))).toBe(true);
  expect(result.results.map((item) => item.public_id)).toEqual(["archive/Happy_Smile"]);
});

function collectionFetcher(resources: Array<Record<string, unknown>>) {
  return jest.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ resources }), { status: 200 }));
}

test.each([
  ["Tìm ảnh Banmao vui vẻ", "banmao/Happy_Smile"],
  ["cyberpunk", "banmao/Cyberpunk_City"],
] as const)("metadata search maps %s to relevant filename vocabulary", async (query, expectedId) => {
  const fetcher = collectionFetcher([
    { ...resource, public_id: expectedId },
    { ...resource, public_id: "banmao/Sad_Rain" },
  ]);
  const result = await readCollectionSearch({ query, limit: 10 }, { cloudinaryUrl, fetch: fetcher });
  expect(result).toMatchObject({ searchMode: "metadata", results: [{ public_id: expectedId, matchedTerms: expect.any(Array), matchReason: expect.any(String), searchMode: "metadata" }] });
  const expressions = fetcher.mock.calls.map((call) => JSON.parse(String(call[1]?.body)).expression as string);
  expect(expressions.join(" ")).toContain(`public_id:*${query === "cyberpunk" ? "cyberpunk" : "happy"}*`);
  expect(expressions.every((expression) => !expression.includes("folder:banmao"))).toBe(true);
});

test("Vietnamese mèo đội mũ matches cat/hat metadata without transliteration false positives", async () => {
  const fetcher = collectionFetcher([
    { ...resource, public_id: "banmao/Cat_Wearing_Hat" },
    { ...resource, public_id: "banmao/Red_Moon" },
    { ...resource, public_id: "banmao/Do_It" },
  ]);
  const result = await readCollectionSearch({ query: "mèo đội mũ", limit: 10 }, { cloudinaryUrl, fetch: fetcher });
  expect(result.results.map((item) => item.public_id)).toEqual(["banmao/Cat_Wearing_Hat"]);
});

test("metadata search scores tags and context and rejects unrelated low scores", async () => {
  const fetcher = collectionFetcher([
    { ...resource, public_id: "banmao/Asset_001", tags: ["bitcoin", "crypto"] },
    { ...resource, public_id: "banmao/Asset_002", context: { caption: "Banmao sleeping under the moon" } },
    { ...resource, public_id: "banmao/Asset_003", tags: ["portrait"], context: { caption: "orange background" } },
  ]);
  const bitcoin = await readCollectionSearch({ query: "bitcoin", limit: 10 }, { cloudinaryUrl, fetch: fetcher });
  expect(bitcoin.results.map((item) => item.public_id)).toEqual(["banmao/Asset_001"]);
  expect(bitcoin.results[0].matchReason).toContain("tags");
  const sleep = await readCollectionSearch({ query: "ngủ", limit: 10 }, { cloudinaryUrl, fetch: fetcher });
  expect(sleep.results.map((item) => item.public_id)).toEqual(["banmao/Asset_002"]);
  const unrelated = await readCollectionSearch({ query: "quantum submarine", limit: 10 }, { cloudinaryUrl, fetch: fetcher });
  expect(unrelated.results).toEqual([]);
});

test("explicit folder is preserved while omitted folder searches broadly", async () => {
  const fetcher = collectionFetcher([{ ...resource, public_id: "other/Happy_Smile", asset_folder: "other" }]);
  await readCollectionSearch({ query: "happy", folder: "other", limit: 10 }, { cloudinaryUrl, fetch: fetcher });
  const request = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
  expect(request.expression).toContain("resource_type:image AND folder:other* AND (");
  expect(request.expression).toContain("public_id:*happy*");
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
