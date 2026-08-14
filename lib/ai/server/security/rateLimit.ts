import { createHash } from "node:crypto";
export function createLocalRateLimiter(config:{limit:number;windowMs:number}){const buckets=new Map<string,{start:number;count:number}>();return {take(subject:string,now=Date.now()){const key=createHash("sha256").update(subject).digest("hex");let b=buckets.get(key);if(!b||now-b.start>=config.windowMs)b={start:now,count:0};b.count++;buckets.set(key,b);return {allowed:b.count<=config.limit,retryAfterMs:Math.max(0,config.windowMs-(now-b.start))};},keys(){return buckets.keys();}};}

export type AtomicRateLimitAdapter={take:(hashedSubject:string,limit:number,windowMs:number,now:number)=>Promise<{allowed:boolean;retryAfterMs:number}>};
export function createRateLimiter(config:{limit:number;windowMs:number;adapter?:AtomicRateLimitAdapter}){
  const local=createLocalRateLimiter(config);
  return {async take(subject:string,now=Date.now()){
    const key=createHash("sha256").update(subject).digest("hex");
    if(config.adapter)return {...await config.adapter.take(key,config.limit,config.windowMs,now),mode:"distributed" as const};
    return {...local.take(subject,now),mode:"local-degraded" as const};
  }};
}
