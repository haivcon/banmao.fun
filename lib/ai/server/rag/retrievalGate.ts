const DOC_INTENT = /\b(doc(?:umentation|s)?|guide|whitepaper|according to|cite|citation|source|policy|how does|how do|explain how|mechanics|terms)\b|文档|指南|引用|문서|가이드|документ|руководств|dokumen|panduan|tài liệu|hướng dẫn/i;
const LIVE_OR_NAV_INTENT = /\b(health|healthy|online|status|open|navigate|go to|focus|fill|live|current|balance|position|portfolio|owned|total|stats?)\b|状态|打开|实时|余额|상태|열기|실시간|статус|открыть|баланс|status|buka|langsung|trạng thái|mở|số dư/i;

export function shouldRetrieveDocs(message: string) {
  return DOC_INTENT.test(message) && !(/^\s*(?:is|show|open|navigate|go|focus|fill)\b/i.test(message) && LIVE_OR_NAV_INTENT.test(message));
}
