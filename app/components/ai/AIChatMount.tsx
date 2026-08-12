import AIChatProvider from "./AIChatProvider";

export default function AIChatMount() {
  if (process.env.AI_CHAT_ENABLED !== "true") return null;
  return <AIChatProvider />;
}
