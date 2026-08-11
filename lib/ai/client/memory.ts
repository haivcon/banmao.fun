import type { AIEpisodicState, AIConversationTurn } from "../contracts";

export type MemoryTurn = AIConversationTurn;
type StoredTurn = { turn: MemoryTurn; at: number; topics: string[]; motifs: string[] };

const STOP_WORDS = new Set(["about", "after", "again", "also", "banmao", "could", "from", "have", "help", "into", "just", "more", "please", "show", "that", "the", "this", "what", "when", "where", "which", "with", "would", "your", "được", "giúp", "không", "làm", "một", "những", "này", "thế", "trong", "với"]);
const MOTIFS: Array<[string, RegExp]> = [
  ["staking and lock mechanics", /stak|lock|khóa/i],
  ["market inspection", /price|market|giá|thị trường/i],
  ["game rules and fairness", /game|fomo|slot|snake|rps|pk|jackpot|trò chơi/i],
  ["collection and community", /collection|hub|post|quest|nft|community|cộng đồng/i],
  ["risk and verification", /risk|verify|safe|security|rủi ro|kiểm tra|an toàn/i],
  ["identity and ecosystem", /yourself|ecosystem|banmao là|giới thiệu/i],
];

function unique(values: string[], limit: number) {
  return [...new Set(values)].slice(0, limit);
}

function inferTopics(content: string) {
  const words = content.toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}._-]{2,}/gu) || [];
  return unique(words.filter((word) => !STOP_WORDS.has(word)).slice(0, 4), 4);
}

function inferMotifs(content: string) {
  return MOTIFS.filter(([, pattern]) => pattern.test(content)).map(([motif]) => motif);
}

export function createTabMemory(config: { maxTurns: number; ttlMs: number }) {
  let optIn = false;
  let turns: StoredTurn[] = [];
  function prune(now: number) { turns = turns.filter((item) => now - item.at <= config.ttlMs); }
  return {
    setOptIn(value: boolean) { optIn = value; if (!value) turns = []; },
    append(turn: MemoryTurn, now = Date.now()) {
      if (!optIn) return;
      const content = turn.content.slice(0, 4000);
      turns.push({ turn: { ...turn, content }, at: now, topics: inferTopics(content), motifs: inferMotifs(content) });
      turns = turns.slice(-config.maxTurns);
    },
    export(now = Date.now()) {
      prune(now);
      return turns.map((item) => ({ ...item.turn }));
    },
    snapshot(now = Date.now()): { history: MemoryTurn[]; episodic: AIEpisodicState } {
      prune(now);
      const recent = turns.slice(-12);
      return {
        history: recent.map((item) => ({ ...item.turn })),
        episodic: {
          recentTopics: unique(recent.flatMap((item) => item.topics).reverse(), 8),
          recentMotifs: unique(recent.flatMap((item) => item.motifs).reverse(), 8),
        },
      };
    },
    clear() { turns = []; },
  };
}
