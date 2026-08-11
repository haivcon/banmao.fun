import manifest from "../../public/ai/mascot/mascot-manifest.json";
import {
  BANMAO_EMOTIONS,
  createEmotionState,
  emotionReducer,
  emotionForSSEEvent,
  emotionForTransactionEvent,
  getStatusPhrase,
  resolveEmotion,
} from "../../lib/ai/client/emotion";
import { getMascotAsset, shouldAnimateMascot } from "../../app/components/ai/mascot/mascotAssets";

describe("BANMAO emotion engine", () => {
  test("covers exactly the 16 checked-in manifest emotions and safe paths", () => {
    expect(BANMAO_EMOTIONS).toEqual(Object.keys(manifest.emotions));
    for (const emotion of BANMAO_EMOTIONS) {
      const asset = getMascotAsset(emotion);
      expect(asset.poster).toBe(manifest.emotions[emotion].poster.src);
      expect(asset.frames).toEqual(manifest.emotions[emotion].frames.map((frame) => frame.src));
      expect([3, 4]).toContain(asset.frames.length);
      expect([asset.poster, ...asset.frames].every((path) => path.startsWith(`/ai/mascot/frames/${emotion}/`))).toBe(true);
    }
    expect(getMascotAsset("made-up" as never)).toBe(getMascotAsset("idle"));
  });

  test("uses deterministic priority and never accepts text or asset paths", () => {
    expect(resolveEmotion(["idle", "thinking", "warning", "error"])).toBe("error");
    expect(resolveEmotion(["answering", "researching", "secure"])).toBe("secure");
    expect(resolveEmotion([])).toBe("idle");
    expect(JSON.stringify(createEmotionState())).not.toContain("asset");
  });

  test("maps panel, stream, tool, citation, retry and clear transitions", () => {
    let state = createEmotionState();
    state = emotionReducer(state, { type: "panel-open" });
    expect(state.emotion).toBe("greeting");
    state = emotionReducer(state, { type: "input-focus" });
    expect(state.emotion).toBe("listening");
    state = emotionReducer(state, { type: "send-start" });
    expect(state.emotion).toBe("thinking");
    state = emotionReducer(state, { type: "tool-running", kind: "retrieval" });
    expect(state.emotion).toBe("researching");
    state = emotionReducer(state, { type: "citation" });
    expect(state.emotion).toBe("researching");
    state = emotionReducer(state, { type: "first-delta" });
    expect(state.emotion).toBe("answering");
    state = emotionReducer(state, { type: "stream-done" });
    expect(state.emotion).toBe("idle");
    expect(emotionReducer(state, { type: "retry" }).emotion).toBe("thinking");
    expect(emotionReducer(state, { type: "clear" }).emotion).toBe("idle");
    expect(emotionReducer(state, { type: "panel-close" })).toMatchObject({ emotion: "goodbye", closeAfterAnimation: true });
  });

  test("maps errors, unavailable tools and one-shot timer completion", () => {
    expect(emotionReducer(createEmotionState(), { type: "tool-unavailable" }).emotion).toBe("warning");
    expect(emotionReducer(createEmotionState(), { type: "tool-error" }).emotion).toBe("error");
    expect(emotionReducer(createEmotionState(), { type: "stream-abort" }).emotion).toBe("idle");
    expect(emotionReducer(createEmotionState(), { type: "stream-error" }).emotion).toBe("error");
    expect(emotionReducer(createEmotionState("greeting"), { type: "animation-complete" }).emotion).toBe("idle");
    expect(emotionReducer(createEmotionState("success"), { type: "animation-complete" }).emotion).toBe("idle");
  });

  test("maps SSE lifecycle without using generated text", () => {
    expect(emotionForSSEEvent("delta", { text: "/ai/mascot/frames/error/poster@256.webp" }, false)).toEqual({ type: "first-delta" });
    expect(emotionForSSEEvent("citation", {}, false)).toEqual({ type: "citation" });
    expect(emotionForSSEEvent("tool", { status: "running", name: "rag.search" }, false)).toEqual({ type: "tool-running", kind: "retrieval" });
    expect(emotionForSSEEvent("tool", { status: "unavailable" }, false)).toEqual({ type: "tool-unavailable" });
    expect(emotionForSSEEvent("error", {}, false)).toEqual({ type: "stream-error" });
    expect(emotionForSSEEvent("delta", { text: "later" }, true)).toBeNull();
  });

  test("maps SIWE and transaction lifecycle conservatively", () => {
    expect(emotionForTransactionEvent("siwe-nonce")).toEqual({ type: "siwe-nonce" });
    expect(emotionForTransactionEvent("siwe-signing")).toEqual({ type: "siwe-signing" });
    expect(emotionForTransactionEvent("siwe-verified")).toEqual({ type: "siwe-verified" });
    expect(emotionForTransactionEvent("tx-prepare")).toEqual({ type: "tx-prepare" });
    expect(emotionForTransactionEvent("tx-simulate-success")).toEqual({ type: "tx-simulate-success" });
    expect(emotionReducer(createEmotionState(), { type: "tx-prepare" }).emotion).toBe("warning");
    expect(emotionReducer(createEmotionState(), { type: "tx-simulate-success" }).emotion).toBe("secure");
    expect(emotionReducer(createEmotionState(), { type: "tx-success" }).emotion).toBe("success");
  });

  test("reduced motion and hidden documents always use a poster", () => {
    expect(shouldAnimateMascot({ userReducedMotion: true, systemReducedMotion: false, documentVisible: true })).toBe(false);
    expect(shouldAnimateMascot({ userReducedMotion: false, systemReducedMotion: true, documentVisible: true })).toBe(false);
    expect(shouldAnimateMascot({ userReducedMotion: false, systemReducedMotion: false, documentVisible: false })).toBe(false);
    expect(shouldAnimateMascot({ userReducedMotion: false, systemReducedMotion: false, documentVisible: true })).toBe(true);
  });

  test("provides localization-ready Vietnamese and English status phrases", () => {
    expect(getStatusPhrase("thinking", "vi")).toBe("Đang suy nghĩ");
    expect(getStatusPhrase("thinking", "en")).toBe("Thinking");
    expect(getStatusPhrase("secure", "fr")).toBe("Safety check complete");
  });
});

describe("transaction callback contract", () => {
  test("contains no autonomous transaction emotion event", () => {
    const events = ["siwe-nonce", "siwe-signing", "siwe-verified", "siwe-error", "tx-prepare", "tx-simulate", "tx-simulate-success", "tx-warning", "tx-error"];
    expect(events.map((event) => emotionForTransactionEvent(event as Parameters<typeof emotionForTransactionEvent>[0]))).not.toContain(null);
  });
});
