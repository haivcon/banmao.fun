import "server-only";
import { z } from "zod";

const folderSchema = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/);
const searchSchema = z.object({ query: z.string().trim().min(1).max(200), folder: folderSchema.default("banmao"), limit: z.number().int().min(1).max(50).default(20) }).strict();
const promptsSchema = z.object({ folder: folderSchema, limit: z.number().int().min(1).max(50).default(20) }).strict();
const questSchema = z.object({ wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).transform((value) => value.toLowerCase()), now: z.date().optional() }).strict();
const MAX_BODY_BYTES = 128_000;
const TIMEOUT_MS = 8_000;
const observedAt = () => new Date().toISOString();

type Fetcher = typeof fetch;
type DbExecute = (query: { sql: string; args: Array<string | number> }) => Promise<{ rows: Array<Record<string, unknown>> }>;
type CloudinaryResource = { public_id: string; secure_url: string; folder?: string; asset_folder?: string; format?: string; resource_type?: string; width?: number; height?: number; bytes?: number; duration?: number; created_at?: string; tags?: string[]; context?: Record<string, string>; aspect_ratio?: number };
const cloudinaryResourceSchema = z.object({ public_id: z.string().min(1).max(500), secure_url: z.string().url().max(2_048), folder: z.string().max(500).optional(), asset_folder: z.string().max(500).optional(), format: z.string().max(30).optional(), resource_type: z.string().max(30).optional(), width: z.number().nonnegative().optional(), height: z.number().nonnegative().optional(), bytes: z.number().nonnegative().optional(), duration: z.number().nonnegative().optional(), created_at: z.string().max(100).optional(), tags: z.array(z.string().max(100)).max(100).optional(), context: z.record(z.string().max(100), z.string().max(2_000)).optional(), aspect_ratio: z.number().nonnegative().optional() }).strip();
const cloudinarySearchPayloadSchema = z.object({ resources: z.array(cloudinaryResourceSchema).max(100).default([]) }).strip();
const rawResourcePayloadSchema = z.object({ resources: z.array(z.object({ public_id: z.string().min(1).max(500), secure_url: z.string().url().max(2_048).optional() }).strip()).max(20).default([]) }).strip();
const promptSchema = z.object({ id: z.number().int(), prompt: z.string().max(8_000), share_link: z.string().url().max(2_048).optional() }).strip();

const KEYWORD_MAP: Record<string, string[]> = {
  cat: ["banmao", "mao", "cat", "kitty", "kitten", "neko"], defi: ["defi", "swap", "stake", "farm", "yield", "liquidity", "pool"], money: ["money", "coin", "token", "crypto", "cash", "rich", "gold"], game: ["game", "play", "gaming", "controller", "arcade"], space: ["space", "galaxy", "moon", "rocket", "astronaut", "cosmos"], food: ["food", "eat", "pizza", "ramen", "sushi", "cook", "chef"], music: ["music", "dj", "guitar", "dance", "party", "disco"], fight: ["fight", "battle", "warrior", "sword", "boxing", "punch"], love: ["love", "heart", "valentine", "romance", "kiss", "cute"], sad: ["sad", "cry", "rain", "lonely", "depressed"], happy: ["happy", "smile", "laugh", "joy", "celebrate", "party"], angry: ["angry", "mad", "rage", "fire", "furious"], cool: ["cool", "sunglasses", "chill", "ice", "snow", "winter"], hot: ["hot", "fire", "flame", "summer", "beach", "sun"], work: ["work", "office", "computer", "laptop", "code", "programming"], sport: ["sport", "football", "basketball", "soccer", "tennis", "gym"], travel: ["travel", "plane", "airplane", "vacation", "tourist", "map"], water: ["water", "sea", "ocean", "swim", "fish", "wave", "surf"], night: ["night", "dark", "moon", "star", "sleep", "dream"], meme: ["meme", "pepe", "doge", "wojak", "chad", "lol", "bruh"],
};

function credentials(value: string | undefined) {
  if (!value) throw new Error("CLOUDINARY_URL is not set");
  const match = value.match(/^cloudinary:\/\/(\d+):([^@]+)@([A-Za-z0-9_-]+)$/);
  if (!match) throw new Error("Invalid CLOUDINARY_URL format");
  return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
}
function tokenize(query: string) { return query.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((token) => token.length > 1); }
function expand(tokens: string[]) {
  const values = new Set(tokens);
  for (const token of tokens) for (const synonyms of Object.values(KEYWORD_MAP)) if (synonyms.includes(token)) for (const synonym of synonyms) values.add(synonym);
  return Array.from(values);
}
function score(publicId: string, folder: string, keywords: string[]) {
  const id = publicId.toLowerCase(), normalizedFolder = folder.toLowerCase();
  return keywords.reduce((total, keyword) => total + (id.includes(keyword) ? 10 : 0) + (normalizedFolder.includes(keyword) ? 5 : 0) + (id.split(/[_\-/]/).some((part) => part.startsWith(keyword)) ? 3 : 0), 0);
}
function mapResource(resource: CloudinaryResource, keywords: string[]) {
  const folder = resource.asset_folder || resource.folder || "";
  return { public_id: resource.public_id, secure_url: resource.secure_url, folder, format: resource.format, resource_type: resource.resource_type, width: resource.width, height: resource.height, bytes: resource.bytes, duration: resource.duration, tags: resource.tags || [], context: resource.context || {}, aspect_ratio: resource.aspect_ratio || (resource.width && resource.height ? +(resource.width / resource.height).toFixed(4) : undefined), score: score(resource.public_id, folder, keywords) };
}
async function boundedText(response: Response) {
  const text = await response.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new Error("Cloudinary response too large");
  return text;
}
async function cloudinarySearch(fetcher: Fetcher, url: string, authorization: string, body: object) {
  const response = await fetcher(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: authorization }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { response, text: await boundedText(response) };
}
function cloudinaryRawUrl(value: string, cloudName: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !url.pathname.startsWith(`/${cloudName}/raw/upload/`)) throw new Error("Unapproved Cloudinary raw URL");
  return url.toString();
}

export async function readCollectionSearch(input: unknown, dependencies: { cloudinaryUrl?: string; fetch?: Fetcher } = {}) {
  const args = searchSchema.parse(input), config = credentials(dependencies.cloudinaryUrl ?? process.env.CLOUDINARY_URL), fetcher = dependencies.fetch || fetch;
  const keywords = expand(tokenize(args.query));
  const url = `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/search`;
  const authorization = "Basic " + Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");
  let fallback = false;
  let result = await cloudinarySearch(fetcher, url, authorization, { expression: `folder:${args.folder}* AND (${keywords.slice(0, 5).map((keyword) => `public_id:*${keyword}*`).join(" OR ")})`, max_results: 100, sort_by: [{ public_id: "asc" }], with_field: ["tags", "context"] });
  if (!result.response.ok) {
    fallback = true;
    result = await cloudinarySearch(fetcher, url, authorization, { expression: `folder:${args.folder}*`, max_results: 100, sort_by: [{ public_id: "asc" }], with_field: ["tags", "context"] });
  }
  if (!result.response.ok) throw new Error("Collection search unavailable");
  const payload = cloudinarySearchPayloadSchema.parse(JSON.parse(result.text));
  const results = payload.resources.map((resource) => mapResource(resource, keywords)).filter((item) => !fallback || item.score > 0).sort((a, b) => b.score - a.score).slice(0, args.limit);
  return { results, total: results.length, query: args.query, keywords: keywords.slice(0, 10), source: "cloudinary:collection-search", observedAt: observedAt() };
}

export async function readCollectionPrompts(input: unknown, dependencies: { cloudinaryUrl?: string; fetch?: Fetcher } = {}) {
  const args = promptsSchema.parse(input), config = credentials(dependencies.cloudinaryUrl ?? process.env.CLOUDINARY_URL), fetcher = dependencies.fetch || fetch;
  const searchUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/search`;
  const authorization = "Basic " + Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");
  let prompts: Array<{ id: number; prompt: string; share_link?: string }> = [], shareLinks: Record<string, string> = {}, hasPrompts = false, hasShareLinks = false;
  for (const folder of [args.folder, `${args.folder}/a_prompt`]) {
    if (hasPrompts && hasShareLinks) break;
    const result = await cloudinarySearch(fetcher, searchUrl, authorization, { expression: `folder:${folder} AND resource_type:raw`, max_results: 20, sort_by: [{ public_id: "asc" }] });
    if (!result.response.ok) continue;
    const payload = rawResourcePayloadSchema.parse(JSON.parse(result.text));
    for (const resource of payload.resources) {
      const publicId = resource.public_id;
      const fallback = `https://res.cloudinary.com/${config.cloudName}/raw/upload/${publicId}.txt`;
      if (!hasPrompts && /\/prompt(?:\.txt)?$/.test(publicId)) {
        try {
          const response = await fetcher(cloudinaryRawUrl(resource.secure_url || fallback, config.cloudName), { signal: AbortSignal.timeout(TIMEOUT_MS) });
          if (response.ok) {
            const text = await boundedText(response);
            try { prompts = z.array(promptSchema).max(50).parse(JSON.parse(text)).slice(0, args.limit); }
            catch { prompts = text.split("\n").map((line) => line.trim()).filter((line) => line.length <= 8_000).slice(0, args.limit).map((prompt, index) => ({ id: index + 1, prompt })); }
            hasPrompts = true;
          }
        } catch { /* ignore unapproved or unavailable raw source */ }
      }
      if (!hasShareLinks && /\/share_links(?:\.txt)?$/.test(publicId)) {
        try {
          const response = await fetcher(cloudinaryRawUrl(resource.secure_url || fallback, config.cloudName), { signal: AbortSignal.timeout(TIMEOUT_MS) });
          if (response.ok) {
            for (const line of (await boundedText(response)).split("\n").slice(0, args.limit)) {
              const separator = line.indexOf(": ");
              if (separator > 0) { const key = line.slice(0, separator).trim(), value = line.slice(separator + 2).trim(); try { const url = new URL(value); if (key.length <= 500 && value.length <= 2_048 && (url.protocol === "https:" || url.protocol === "http:")) shareLinks[key] = value; } catch { /* invalid share URL */ } }
            }
            hasShareLinks = true;
          }
        } catch { /* ignore unapproved or unavailable raw source */ }
      }
    }
  }
  for (const prompt of prompts) if (prompt.share_link) shareLinks[`prompt_${prompt.id}`] = prompt.share_link;
  return { prompts: prompts.slice(0, args.limit), shareLinks, folder: args.folder, hasPrompts, hasShareLinks, source: "cloudinary:collection-prompts", observedAt: observedAt() };
}

const DAILY_QUESTS = [
  { id: "post_today", title: "Share a Post", icon: "📸", description: "Create a post today", target: 1, reward: 20, query: "posts_today" },
  { id: "like_3", title: "Show Love", icon: "❤️", description: "Like 3 posts", target: 3, reward: 10, query: "likes_today" },
  { id: "comment_1", title: "Join the Chat", icon: "💬", description: "Leave a comment", target: 1, reward: 15, query: "comments_today" },
  { id: "checkin", title: "Daily Check-in", icon: "📅", description: "Complete daily check-in", target: 1, reward: 10, query: "checkin_today" },
] as const;
const WEEKLY_QUESTS = [
  { id: "post_5_week", title: "Weekly Creator", icon: "🌟", description: "Create 5 posts this week", target: 5, reward: 100, query: "posts_week" },
  { id: "like_20_week", title: "Community Champion", icon: "🏅", description: "Like 20 posts this week", target: 20, reward: 50, query: "likes_week" },
  { id: "tip_1_week", title: "Generous Tipper", icon: "💰", description: "Send a tip this week", target: 1, reward: 75, query: "tips_week" },
  { id: "streak_7", title: "7-Day Streak", icon: "🔥", description: "Maintain a 7-day check-in streak", target: 7, reward: 200, query: "streak" },
] as const;
export async function readCollectionQuests(input: unknown, dependencies: { execute: DbExecute; strictFailures?: boolean }) {
  const args = questSchema.parse(input), current = args.now || new Date(), today = current.toISOString().split("T")[0], week = new Date(current);
  week.setUTCDate(week.getUTCDate() - week.getUTCDay());
  const weekStart = week.toISOString().split("T")[0];
  const definitions = [
    ["posts_today", "SELECT COUNT(*) as cnt FROM hub_posts WHERE LOWER(author_address) = ? AND created_at >= ?", [args.wallet, new Date(today).getTime()]],
    ["likes_today", "SELECT COUNT(*) as cnt FROM hub_likes WHERE LOWER(user_address) = ? AND created_at >= ?", [args.wallet, new Date(today).getTime()]],
    ["comments_today", "SELECT COUNT(*) as cnt FROM hub_comments WHERE LOWER(author_address) = ? AND created_at >= ?", [args.wallet, new Date(today).getTime()]],
    ["checkin_today", "SELECT COUNT(*) as cnt FROM hub_checkins WHERE LOWER(user_address) = ? AND checkin_date = ?", [args.wallet, today]],
    ["posts_week", "SELECT COUNT(*) as cnt FROM hub_posts WHERE LOWER(author_address) = ? AND created_at >= ?", [args.wallet, new Date(weekStart).getTime()]],
    ["likes_week", "SELECT COUNT(*) as cnt FROM hub_likes WHERE LOWER(user_address) = ? AND created_at >= ?", [args.wallet, new Date(weekStart).getTime()]],
    ["tips_week", "SELECT COUNT(*) as cnt FROM hub_tips WHERE LOWER(tipper_address) = ? AND created_at >= ?", [args.wallet, new Date(weekStart).getTime()]],
    ["streak", "SELECT MAX(streak) as max_streak FROM hub_checkins WHERE LOWER(user_address) = ?", [args.wallet]],
  ] as const;
  const stats: Record<string, number> = {};
  await Promise.all(definitions.map(async ([name, sql, values]) => { try { const result = await dependencies.execute({ sql, args: [...values] }); stats[name] = Number(result.rows[0]?.[name === "streak" ? "max_streak" : "cnt"] || 0); } catch (error) { if (dependencies.strictFailures) throw error; stats[name] = 0; } }));
  const mapQuest = <T extends (typeof DAILY_QUESTS | typeof WEEKLY_QUESTS)[number]>(quest: T, type: "daily" | "weekly") => ({ ...quest, type, progress: Math.min(stats[quest.query] || 0, quest.target), completed: (stats[quest.query] || 0) >= quest.target });
  return { quests: [...DAILY_QUESTS.map((quest) => mapQuest(quest, "daily")), ...WEEKLY_QUESTS.map((quest) => mapQuest(quest, "weekly"))], source: "internal-db:hub-quests", observedAt: observedAt() };
}
