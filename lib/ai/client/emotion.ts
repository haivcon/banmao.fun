export const BANMAO_EMOTIONS = [
  "idle", "greeting", "listening", "thinking", "researching", "working", "answering", "success",
  "excited", "secure", "warning", "confused", "error", "sleeping", "love", "goodbye",
] as const;

export type BanmaoEmotion = (typeof BANMAO_EMOTIONS)[number];

export type EmotionEvent =
  | { type: "panel-open" | "panel-close" | "input-focus" | "input-change" | "send-start" | "citation" | "tool-success" | "tool-unavailable" | "tool-error" | "first-delta" | "stream-done" | "stream-abort" | "stream-error" | "retry" | "clear" | "siwe-nonce" | "siwe-signing" | "siwe-verified" | "siwe-error" | "tx-prepare" | "tx-simulate" | "tx-simulate-success" | "tx-success" | "tx-warning" | "tx-error" | "animation-complete" }
  | { type: "tool-running"; kind?: "retrieval" | "tool" };

export type EmotionState = {
  emotion: BanmaoEmotion;
  closeAfterAnimation: boolean;
  sequence: number;
};

const PRIORITY: readonly BanmaoEmotion[] = [
  "error", "warning", "secure", "working", "researching", "answering", "thinking", "listening", "greeting", "idle", "sleeping",
];

export function resolveEmotion(active: readonly BanmaoEmotion[]): BanmaoEmotion {
  return PRIORITY.find((emotion) => active.includes(emotion)) ?? active[0] ?? "idle";
}

export function createEmotionState(emotion: BanmaoEmotion = "idle"): EmotionState {
  return { emotion, closeAfterAnimation: false, sequence: 0 };
}

function next(state: EmotionState, emotion: BanmaoEmotion, closeAfterAnimation = false): EmotionState {
  if (state.emotion === emotion && state.closeAfterAnimation === closeAfterAnimation) return state;
  return { emotion, closeAfterAnimation, sequence: state.sequence + 1 };
}

export function emotionReducer(state: EmotionState, event: EmotionEvent): EmotionState {
  switch (event.type) {
    case "panel-open": return next(state, "greeting");
    case "panel-close": return next(state, "goodbye", true);
    case "input-focus":
    case "input-change": return next(state, "listening");
    case "send-start":
    case "retry": return next(state, "thinking");
    case "citation": return next(state, "researching");
    case "tool-running": return next(state, event.kind === "retrieval" ? "researching" : "working");
    case "tool-success": return next(state, "answering");
    case "tool-unavailable":
    case "tx-prepare":
    case "tx-simulate":
    case "tx-warning": return next(state, "warning");
    case "tool-error":
    case "stream-error":
    case "siwe-error":
    case "tx-error": return next(state, "error");
    case "first-delta": return next(state, "answering");
    case "stream-done":
    case "stream-abort":
    case "clear": return next(state, "idle");
    case "siwe-nonce":
    case "siwe-signing": return next(state, "warning");
    case "siwe-verified":
    case "tx-simulate-success": return next(state, "secure");
    case "tx-success": return next(state, "success");
    case "animation-complete":
      return state.emotion === "greeting" || state.emotion === "success" ? next(state, "idle") : state;
  }
}

type SSEData = { text?: unknown; status?: unknown; name?: unknown };

export function emotionForSSEEvent(event: string | undefined, data: SSEData, receivedFirstDelta: boolean): EmotionEvent | null {
  if (event === "delta") return receivedFirstDelta ? null : { type: "first-delta" };
  if (event === "citation") return { type: "citation" };
  if (event === "error") return { type: "stream-error" };
  if (event !== "tool") return null;
  const status = typeof data.status === "string" ? data.status.toLowerCase() : "";
  if (status.includes("error") || status.includes("failed")) return { type: "tool-error" };
  if (status.includes("unavailable") || status.includes("disabled")) return { type: "tool-unavailable" };
  if (status.includes("success") || status.includes("complete") || status.includes("available")) return { type: "tool-success" };
  const name = typeof data.name === "string" ? data.name.toLowerCase() : "";
  return { type: "tool-running", kind: /rag|search|retriev|document|collection/.test(name) ? "retrieval" : "tool" };
}

export type TransactionEmotionEvent =
  | "siwe-nonce" | "siwe-signing" | "siwe-verified" | "siwe-error"
  | "tx-prepare" | "tx-simulate" | "tx-simulate-success" | "tx-success" | "tx-warning" | "tx-error";

export function emotionForTransactionEvent(event: TransactionEmotionEvent): EmotionEvent {
  return { type: event };
}

const STATUS_PHRASES: Record<"en" | "vi" | "zh" | "ko" | "ru" | "id", Record<BanmaoEmotion, string>> = {
  en: {
    idle: "Ready to help", greeting: "Hello!", listening: "Listening", thinking: "Thinking", researching: "Checking sources",
    working: "Using a tool", answering: "Answering", success: "Completed", excited: "Great news", secure: "Safety check complete",
    warning: "Review carefully", confused: "More detail may help", error: "Something went wrong", sleeping: "Resting", love: "Thank you", goodbye: "See you soon",
  },
  vi: {
    idle: "Sẵn sàng hỗ trợ", greeting: "Xin chào!", listening: "Đang lắng nghe", thinking: "Đang suy nghĩ", researching: "Đang kiểm tra nguồn",
    working: "Đang dùng công cụ", answering: "Đang trả lời", success: "Đã hoàn tất", excited: "Tin vui", secure: "Đã kiểm tra an toàn",
    warning: "Hãy kiểm tra kỹ", confused: "Cần thêm thông tin", error: "Đã xảy ra lỗi", sleeping: "Đang nghỉ", love: "Cảm ơn bạn", goodbye: "Hẹn gặp lại",
  },
  zh: { idle:"随时为您服务", greeting:"您好！", listening:"正在聆听", thinking:"正在思考", researching:"正在核对来源", working:"正在使用工具", answering:"正在回答", success:"已完成", excited:"好消息", secure:"安全检查完成", warning:"请仔细检查", confused:"提供更多细节会更有帮助", error:"出现错误", sleeping:"休息中", love:"谢谢您", goodbye:"回头见" },
  ko: { idle:"도울 준비가 됐어요", greeting:"안녕하세요!", listening:"듣는 중", thinking:"생각 중", researching:"출처 확인 중", working:"도구 사용 중", answering:"답변 중", success:"완료됨", excited:"좋은 소식", secure:"안전 확인 완료", warning:"주의 깊게 검토하세요", confused:"자세한 내용이 필요해요", error:"문제가 발생했어요", sleeping:"쉬는 중", love:"감사합니다", goodbye:"곧 다시 만나요" },
  ru: { idle:"Готов помочь", greeting:"Здравствуйте!", listening:"Слушаю", thinking:"Думаю", researching:"Проверяю источники", working:"Использую инструмент", answering:"Отвечаю", success:"Готово", excited:"Отличные новости", secure:"Проверка безопасности завершена", warning:"Проверьте внимательно", confused:"Нужно больше деталей", error:"Что-то пошло не так", sleeping:"Отдыхаю", love:"Спасибо", goodbye:"До скорого" },
  id: { idle:"Siap membantu", greeting:"Halo!", listening:"Mendengarkan", thinking:"Berpikir", researching:"Memeriksa sumber", working:"Menggunakan alat", answering:"Menjawab", success:"Selesai", excited:"Kabar baik", secure:"Pemeriksaan keamanan selesai", warning:"Tinjau dengan cermat", confused:"Detail tambahan akan membantu", error:"Terjadi kesalahan", sleeping:"Beristirahat", love:"Terima kasih", goodbye:"Sampai jumpa" },
};

export function getStatusPhrase(emotion: BanmaoEmotion, language?: string): string {
  const locale = language?.toLowerCase().split(/[-_]/)[0];
  return STATUS_PHRASES[locale && locale in STATUS_PHRASES ? locale as keyof typeof STATUS_PHRASES : "en"][emotion];
}

export const ONE_SHOT_EMOTIONS: ReadonlySet<BanmaoEmotion> = new Set<BanmaoEmotion>(["greeting", "success", "error", "goodbye"]);
