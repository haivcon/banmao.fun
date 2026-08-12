import "server-only";
import { z } from "zod";

const folderSchema = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/);
const searchSchema = z.object({ query: z.string().trim().min(1).max(200), folder: folderSchema.optional(), limit: z.number().int().min(1).max(50).default(20) }).strict();
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

// Bounded aliases map supported-locale wording to vocabulary used in filenames and metadata.
// This is deterministic metadata-semantic matching, not pixel/image analysis.
const CONCEPTS: Record<string, { aliases: string[]; terms: string[] }> = {
  cat: { aliases: ["cat", "kitty", "kitten", "banmao", "mao", "mèo", "猫", "고양이", "кот", "кошка", "kucing"], terms: ["cat", "kitty", "kitten", "neko"] },
  happy: { aliases: ["happy", "joy", "smile", "vui", "vui vẻ", "hạnh phúc", "开心", "快乐", "행복", "웃는", "веселый", "счастливый", "senang", "bahagia"], terms: ["happy", "smile", "laugh", "joy", "celebrate"] },
  sad: { aliases: ["sad", "buồn", "伤心", "悲伤", "슬픈", "грустный", "sedih"], terms: ["sad", "cry", "rain", "lonely"] },
  angry: { aliases: ["angry", "giận", "tức giận", "生气", "愤怒", "화난", "злой", "сердитый", "marah"], terms: ["angry", "mad", "rage", "furious", "fire"] },
  hat: { aliases: ["hat", "wearing hat", "đội mũ", "戴帽子", "모자", "в шляпе", "topi"], terms: ["hat", "cap", "beanie", "helmet", "wearing"] },
  cute: { aliases: ["cute", "dễ thương", "可爱", "귀여운", "милый", "lucu", "imut"], terms: ["cute", "adorable", "kawaii", "sweet"] },
  space: { aliases: ["space", "không gian", "vũ trụ", "太空", "宇宙", "우주", "космос", "luar angkasa"], terms: ["space", "galaxy", "moon", "rocket", "astronaut", "cosmos"] },
  cyberpunk: { aliases: ["cyberpunk", "赛博朋克", "사이버펑크", "киберпанк"], terms: ["cyberpunk", "cyber", "neon", "futuristic"] },
  bitcoin: { aliases: ["bitcoin", "btc", "比特币", "비트코인", "биткоин"], terms: ["bitcoin", "btc", "crypto", "coin"] },
  game: { aliases: ["game", "gaming", "trò chơi", "chơi game", "游戏", "게임", "игра", "permainan"], terms: ["game", "play", "gaming", "controller", "arcade"] },
  food: { aliases: ["food", "eat", "ăn", "thức ăn", "吃", "食物", "먹는", "음식", "еда", "есть", "makan", "makanan"], terms: ["food", "eat", "eating", "pizza", "ramen", "sushi", "cook", "chef"] },
  sleep: { aliases: ["sleep", "sleeping", "ngủ", "睡觉", "자는", "잠", "спать", "сон", "tidur"], terms: ["sleep", "sleeping", "dream", "bed", "night"] },
  music: { aliases: ["music", "nhạc", "音乐", "음악", "музыка", "musik"], terms: ["music", "dj", "guitar", "dance", "party"] },
  love: { aliases: ["love", "yêu", "tình yêu", "爱", "사랑", "любовь", "cinta"], terms: ["love", "heart", "valentine", "romance", "kiss"] },
  work: { aliases: ["work", "làm việc", "工作", "일", "работа", "kerja"], terms: ["work", "office", "computer", "laptop", "code"] },
};
const STOPWORDS = new Set(["anh", "image", "images", "photo", "photos", "picture", "pictures", "find", "search", "show", "please", "tim", "kiem", "trong", "bo", "suu", "tap", "cho", "toi", "mot", "cua", "the", "and", "with", "for", "this", "that"]);

function credentials(value: string | undefined) {
  if (!value) throw new Error("CLOUDINARY_URL is not set");
  const match = value.match(/^cloudinary:\/\/(\d+):([^@]+)@([A-Za-z0-9_-]+)$/);
  if (!match) throw new Error("Invalid CLOUDINARY_URL format");
  return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
}
function normalize(value: string) {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/\p{M}+/gu, "").replace(/đ/g, "d").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
function tokenize(value: string) {
  return normalize(value).split(/\s+/).filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}
function expand(query: string) {
  const normalizedQuery = normalize(query), tokens = tokenize(query), values = new Set(tokens);
  for (const concept of Object.values(CONCEPTS)) {
    const matched = concept.aliases.some((alias) => {
      const normalizedAlias = normalize(alias);
      return normalizedAlias.includes(" ") ? ` ${normalizedQuery} `.includes(` ${normalizedAlias} `) : tokens.includes(normalizedAlias);
    });
    if (matched) concept.terms.forEach((term) => values.add(normalize(term)));
  }
  return Array.from(values).filter((term) => term.length >= 3).slice(0, 40);
}
type MatchField = "public_id" | "folder" | "tags" | "context";
function scoreField(value: string, keywords: string[], weight: number) {
  const normalized = normalize(value), tokens = normalized.split(/\s+/).filter(Boolean), matched = new Set<string>();
  let valueScore = 0;
  for (const keyword of keywords) {
    if (tokens.includes(keyword)) { valueScore += 12 * weight; matched.add(keyword); }
    else if (tokens.some((token) => token.length >= 4 && keyword.length >= 4 && token.startsWith(keyword))) { valueScore += 7 * weight; matched.add(keyword); }
    else if (keyword.length >= 4 && normalized.includes(keyword)) { valueScore += 4 * weight; matched.add(keyword); }
  }
  return { score: valueScore, matched: Array.from(matched) };
}
function mapResource(resource: CloudinaryResource, keywords: string[]) {
  const folder = resource.asset_folder || resource.folder || "", tags = resource.tags || [], context = resource.context || {};
  const fields: Array<[MatchField, string, number]> = [
    ["public_id", resource.public_id.split("/").at(-1) || resource.public_id, 4], ["folder", folder, 1], ["tags", tags.join(" "), 3], ["context", Object.values(context).join(" "), 2],
  ];
  let total = 0;
  const terms = new Set<string>(), reasons: MatchField[] = [];
  for (const [field, value, weight] of fields) {
    const result = scoreField(value, keywords, weight);
    total += result.score;
    if (result.matched.length) { reasons.push(field); result.matched.forEach((term) => terms.add(term)); }
  }
  const matchedTerms = Array.from(terms).slice(0, 12);
  return { public_id: resource.public_id, secure_url: resource.secure_url, folder, format: resource.format, resource_type: resource.resource_type, width: resource.width, height: resource.height, bytes: resource.bytes, duration: resource.duration, tags, context, aspect_ratio: resource.aspect_ratio || (resource.width && resource.height ? +(resource.width / resource.height).toFixed(4) : undefined), score: total, matchedTerms, matchReason: reasons.join(", "), searchMode: "metadata" as const };
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
const MAX_SEARCH_QUERIES = 3;
const SEARCH_TERMS_PER_QUERY = 4;
function searchExpressions(keywords: string[], folder?: string) {
  const prefix = folder ? `resource_type:image AND folder:${folder}* AND ` : "resource_type:image AND ";
  return Array.from({ length: Math.min(MAX_SEARCH_QUERIES, Math.ceil(keywords.length / SEARCH_TERMS_PER_QUERY)) }, (_, index) => {
    const terms = keywords.slice(index * SEARCH_TERMS_PER_QUERY, (index + 1) * SEARCH_TERMS_PER_QUERY);
    const publicId = terms.map((term) => `public_id:*${term}*`);
    const metadata = terms.flatMap((term) => [`tags=${term}`, `context:*${term}*`]);
    return { metadata: `${prefix}(${[...publicId, ...metadata].join(" OR ")})`, publicId: `${prefix}(${publicId.join(" OR ")})` };
  });
}
function cloudinaryRawUrl(value: string, cloudName: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !url.pathname.startsWith(`/${cloudName}/raw/upload/`)) throw new Error("Unapproved Cloudinary raw URL");
  return url.toString();
}

export async function readCollectionSearch(input: unknown, dependencies: { cloudinaryUrl?: string; fetch?: Fetcher } = {}) {
  const args = searchSchema.parse(input), config = credentials(dependencies.cloudinaryUrl ?? process.env.CLOUDINARY_URL), fetcher = dependencies.fetch || fetch;
  const keywords = expand(args.query);
  const url = `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/search`;
  const authorization = "Basic " + Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");
  const resources = new Map<string, CloudinaryResource>();
  let successfulQueries = 0;
  for (const expressions of searchExpressions(keywords, args.folder)) {
    let result = await cloudinarySearch(fetcher, url, authorization, { expression: expressions.metadata, max_results: 100, sort_by: [{ public_id: "asc" }], with_field: ["tags", "context"] });
    if (!result.response.ok) result = await cloudinarySearch(fetcher, url, authorization, { expression: expressions.publicId, max_results: 100, sort_by: [{ public_id: "asc" }], with_field: ["tags", "context"] });
    if (!result.response.ok) continue;
    successfulQueries += 1;
    const payload = cloudinarySearchPayloadSchema.parse(JSON.parse(result.text));
    for (const resource of payload.resources) resources.set(resource.public_id, resource);
  }
  if (!successfulQueries) throw new Error("Collection search unavailable");
  const results = Array.from(resources.values()).map((resource) => mapResource(resource, keywords)).filter((item) => item.score >= 30).sort((a, b) => b.score - a.score || a.public_id.localeCompare(b.public_id)).slice(0, args.limit);
  return { results, total: results.length, query: args.query, keywords: keywords.slice(0, 10), searchMode: "metadata" as const, source: "cloudinary:collection-search", observedAt: observedAt() };
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
