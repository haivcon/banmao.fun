import { safeMetric,safeLogRecord } from "../../lib/ai/server/observability";
test("observability drops raw sensitive fields",()=>{const record=safeLogRecord({requestId:"r",status:"ok",prompt:"secret",wallet:"0xabc",authorization:"Bearer secret"} as never);expect(JSON.stringify(record)).not.toMatch(/secret|0xabc|authorization|prompt/i);expect(safeMetric({requestId:"r",status:"ok",durationMs:1})).toBeTruthy();});


test("observability admits useful bounded metrics",()=>{const r=safeLogRecord({requestId:"r",model:"open9",status:"ok",durationMs:2,ragMode:"hybrid",ragHitCount:3,retryCount:1,toolDurationMs:4,toolStatus:"available",walletAddress:"0xabc",history:["private"]});expect(r).toMatchObject({ragMode:"hybrid",retryCount:1,toolDurationMs:4,toolStatus:"available"});expect(JSON.stringify(r)).not.toMatch(/walletAddress|private/);});
