import type { AISurface } from "../contracts";
const routes: Array<[string,AISurface]>=[["/collection","collection"],["/gamefi","gamefi"],["/defi","defi"]];
const collectionMediaConcepts = new Set([
  "cat", "kitty", "kitten", "banmao", "mao", "mèo", "猫", "고양이", "кот", "кошка", "kucing",
  "happy", "joy", "smile", "vui", "vui vẻ", "hạnh phúc", "开心", "快乐", "행복", "웃는", "веселый", "счастливый", "senang", "bahagia",
  "sad", "buồn", "伤心", "悲伤", "슬픈", "грустный", "sedih",
  "angry", "giận", "tức giận", "生气", "愤怒", "화난", "злой", "сердитый", "marah",
  "hat", "wearing hat", "đội mũ", "戴帽子", "모자", "в шляпе", "topi",
  "cute", "dễ thương", "可爱", "귀여운", "милый", "lucu", "imut",
  "space", "không gian", "vũ trụ", "太空", "宇宙", "우주", "космос", "luar angkasa",
  "cyberpunk", "赛博朋克", "사이버펑크", "киберпанк",
  "bitcoin", "btc", "比特币", "비트코인", "биткоин",
  "game", "gaming", "trò chơi", "chơi game", "游戏", "게임", "игра", "permainan",
  "food", "eat", "ăn", "thức ăn", "吃", "食物", "먹는", "음식", "еда", "есть", "makan", "makanan",
  "sleep", "sleeping", "ngủ", "睡觉", "자는", "잠", "спать", "сон", "tidur",
  "music", "nhạc", "音乐", "음악", "музыка", "musik",
  "love", "yêu", "tình yêu", "爱", "사랑", "любовь", "cinta",
  "work", "làm việc", "工作", "일", "работа", "kerja",
].map(normalizeCollectionConcept));

function normalizeCollectionConcept(value:string) {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/\p{M}+/gu, "").replace(/đ/g, "d").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function isCollectionMediaConcept(message:string, surface:AISurface) {
  const concept = normalizeCollectionConcept(message);
  return surface === "collection" && concept.length >= 3 && collectionMediaConcepts.has(concept);
}
export function surfaceForPath(pathname:string):AISurface|null { const path=pathname.split(/[?#]/,1)[0].replace(/\/+$/,"/"); if(path==="/") return "landing"; for(const [prefix,surface] of routes) if(path===prefix || path.startsWith(prefix+"/")) return surface; return null; }
export function resolveContext(pathname:string, claimed:AISurface){ const surface=surfaceForPath(pathname); if(!surface) throw new Error("Unsupported pathname"); if(surface!==claimed) throw new Error("Context mismatch"); return Object.freeze({surface,pathname}); }
export function routeContext(context:{pathname:string;surface:AISurface}){return resolveContext(context.pathname,context.surface);}
