import type { AIEpisodicState, AIConversationTurn } from "../contracts";
export type MemoryTurn = AIConversationTurn;
type StoredTurn = { turn: MemoryTurn; at: number; topics: string[]; motifs: string[] };
type StorageLike = Pick<Storage,"getItem"|"setItem"|"removeItem">;
const VERSION=1;
const STOP_WORDS=new Set(["about","after","again","also","banmao","could","from","have","help","into","just","more","please","show","that","the","this","what","when","where","which","with","would","your","được","giúp","không","làm","một","những","này","thế","trong","với"]);
const MOTIFS:Array<[string,RegExp]>=[["staking and lock mechanics",/stak|lock|khóa/i],["market inspection",/price|market|giá|thị trường/i],["game rules and fairness",/game|fomo|slot|snake|rps|pk|jackpot|trò chơi/i],["collection and community",/collection|hub|post|quest|nft|community|cộng đồng/i],["risk and verification",/risk|verify|safe|security|rủi ro|kiểm tra|an toàn/i],["identity and ecosystem",/yourself|ecosystem|banmao là|giới thiệu/i]];
const unique=(v:string[],n:number)=>[...new Set(v)].slice(0,n);
const topics=(c:string)=>unique((c.toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}._-]{2,}/gu)||[]).filter(w=>!STOP_WORDS.has(w)).slice(0,4),4);
const motifs=(c:string)=>MOTIFS.filter(([,p])=>p.test(c)).map(([m])=>m);
export function createTabMemory(config:{maxTurns:number;ttlMs:number;storage?:StorageLike;storageKey?:string}){
 let optIn=false,turns:StoredTurn[]=[],hydrated=false; const key=config.storageKey||"banmao-ai-memory-v1";
 const valid=(x:unknown):x is StoredTurn=>!!x&&typeof x==="object"&&["user","assistant"].includes(String((x as StoredTurn).turn?.role))&&typeof (x as StoredTurn).turn?.content==="string"&&typeof (x as StoredTurn).at==="number"&&Array.isArray((x as StoredTurn).topics)&&Array.isArray((x as StoredTurn).motifs);
 const persist=()=>{if(!config.storage)return;if(!optIn||!turns.length)config.storage.removeItem(key);else config.storage.setItem(key,JSON.stringify({version:VERSION,turns:turns.slice(-config.maxTurns)}));};
 const prune=(now:number)=>{turns=turns.filter(x=>now-x.at<=config.ttlMs);};
 const hydrate=(now:number)=>{if(hydrated||!config.storage)return;hydrated=true;try{const data=JSON.parse(config.storage.getItem(key)||"null");if(data?.version!==VERSION||!Array.isArray(data.turns)||!data.turns.every(valid))throw new Error();turns=data.turns.slice(-config.maxTurns);prune(now);persist();}catch{turns=[];config.storage.removeItem(key);}};
 return {setOptIn(value:boolean,now=Date.now()){optIn=value;if(value)hydrate(now);else{turns=[];persist();}},append(turn:MemoryTurn,now=Date.now()){if(!optIn)return;hydrate(now);const content=turn.content.slice(0,4000);turns.push({turn:{...turn,content},at:now,topics:topics(content),motifs:motifs(content)});prune(now);turns=turns.slice(-config.maxTurns);persist();},export(now=Date.now()){if(optIn)hydrate(now);prune(now);persist();return turns.map(x=>({...x.turn}));},snapshot(now=Date.now()):{history:MemoryTurn[];episodic:AIEpisodicState}{if(optIn)hydrate(now);prune(now);persist();const recent=turns.slice(-12);return{history:recent.map(x=>({...x.turn})),episodic:{recentTopics:unique(recent.flatMap(x=>x.topics).reverse(),8),recentMotifs:unique(recent.flatMap(x=>x.motifs).reverse(),8)}};},clear(){turns=[];persist();}};
}
