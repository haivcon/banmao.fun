export type AIMetric={requestId:string;model?:string;surface?:string;status:string;durationMs:number};
export function safeMetric(metric:AIMetric){return Object.freeze({...metric});}
export function safeLogRecord(input: Record<string, unknown>){
  const allowed = ["requestId", "model", "surface", "status", "durationMs", "errorCode", "toolName", "toolDurationMs", "toolStatus", "toolRounds", "personaVersion", "ragMode", "ragStatus", "ragHitCount", "retryCount", "abort", "interrupted", "rateLimited", "inputTokens", "outputTokens", "ttftMs", "streamBytes", "finishReason", "voiceWarningCount", "errorPhase", "upstreamStatus"] as const;
  return Object.freeze(Object.fromEntries(allowed.filter(key => input[key] !== undefined).map(key => [key, input[key]])));
}
