import { createNonceStore } from "../../../lib/ai/server/auth/nonce";import { parseAndValidateSiwe } from "../../../lib/ai/server/auth/siwe";
test("nonce consumption is atomic and one-time",()=>{const store=createNonceStore({ttlMs:1000});const issued=store.issue("sid",0);expect(store.consume("sid",issued.nonce,1)).toBe(true);expect(store.consume("sid",issued.nonce,2)).toBe(false);});
test("SIWE policy binds domain uri chain nonce and expiry",()=>{const now=new Date("2026-08-10T00:00:00Z");const message=`banmao.fun wants you to sign in with your Ethereum account:
0x0000000000000000000000000000000000000001

Sign in

URI: https://banmao.fun
Version: 1
Chain ID: 196
Nonce: abcdef12
Issued At: 2026-08-10T00:00:00.000Z
Expiration Time: 2026-08-10T00:05:00.000Z`;expect(parseAndValidateSiwe(message,{domain:"banmao.fun",uri:"https://banmao.fun",chainIds:[196],nonce:"abcdef12",now}).address).toMatch(/^0x/);expect(()=>parseAndValidateSiwe(message,{domain:"evil.test",uri:"https://banmao.fun",chainIds:[196],nonce:"abcdef12",now})).toThrow("domain");});
test("SIWE proof has a bounded issuance age and lifetime",()=>{const now=new Date("2026-08-10T00:20:00Z");const base=`banmao.fun wants you to sign in with your Ethereum account:\n0x0000000000000000000000000000000000000001\n\nSign in\n\nURI: https://banmao.fun\nVersion: 1\nChain ID: 196\nNonce: abcdef12\nIssued At: 2026-08-10T00:00:00.000Z\nExpiration Time: 2026-08-10T00:25:00.000Z`;expect(()=>parseAndValidateSiwe(base,{domain:"banmao.fun",uri:"https://banmao.fun",chainIds:[196],nonce:"abcdef12",now})).toThrow("Issued");const longLived=base.replace("Issued At: 2026-08-10T00:00:00.000Z","Issued At: 2026-08-10T00:20:00.000Z").replace("Expiration Time: 2026-08-10T00:25:00.000Z","Expiration Time: 2026-08-10T01:00:01.000Z");expect(()=>parseAndValidateSiwe(longLived,{domain:"banmao.fun",uri:"https://banmao.fun",chainIds:[196],nonce:"abcdef12",now})).toThrow("lifetime");});
