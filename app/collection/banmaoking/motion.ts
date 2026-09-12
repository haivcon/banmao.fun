import { expressionSvg } from "./artwork";

// Matches the eye wrappers emitted by BanmaoKingExpressionLib on-chain.
export function animatedExpressionSvg(id: number) {
  const svg = expressionSvg(id);
  const start = '<g id="expression">';
  const nose = svg.indexOf('<path d="M256 240');
  if (nose < 0) return svg;
  const details = id === 6 ? svg.indexOf('<path d="M198 191') : id === 7 ? svg.indexOf('<g class="king-tears">') : nose;
  const eyeEnd = details >= 0 ? details : nose;
  const eyes = svg.slice(start.length, eyeEnd);
  const motion = id === 4 || id === 11 ? "king-eyes-rest" : "king-eyes-blink";
  return `${start}<g class="${motion}">${eyes}</g>${svg.slice(eyeEnd)}`;
}
