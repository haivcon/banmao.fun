import { enforceRequestBudget } from "../../lib/ai/server/security/abuse";
test("budgets are deterministic and fail closed",()=>{expect(enforceRequestBudget({message:"abc",maxPromptBytes:3,maxEstimatedTokens:1})).toEqual({promptBytes:3,estimatedTokens:1});expect(()=>enforceRequestBudget({message:"abcd",maxPromptBytes:3,maxEstimatedTokens:1})).toThrow("budget");});
