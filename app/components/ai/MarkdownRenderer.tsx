"use client";

import { Check, Copy } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import { aiText } from "../../../lib/ai/client/i18n";

function inline(text: string): ReactNode[] {
  const pattern = /(https?:\/\/[^\s<]+|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    if (match[2] && match[3]) nodes.push(<a key={index} href={match[3]} target="_blank" rel="noopener noreferrer">{match[2]}</a>);
    else if (match[4]) nodes.push(<code key={index}>{match[4]}</code>);
    else if (match[5] || match[6]) nodes.push(<strong key={index}>{match[5] || match[6]}</strong>);
    else if (match[7] || match[8]) nodes.push(<em key={index}>{match[7] || match[8]}</em>);
    else nodes.push(<a key={index} href={match[1]} target="_blank" rel="noopener noreferrer">{match[1]}</a>);
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function renderTextBlock(text: string, key: number): ReactNode {
  const lines = text.split("\n");
  if (lines.every((line) => /^\s*[-*+]\s+/.test(line))) {
    return <ul key={key}>{lines.map((line, index) => <li key={index}>{inline(line.replace(/^\s*[-*+]\s+/, ""))}</li>)}</ul>;
  }
  if (lines.every((line) => /^\s*\d+[.)]\s+/.test(line))) {
    return <ol key={key}>{lines.map((line, index) => <li key={index}>{inline(line.replace(/^\s*\d+[.)]\s+/, ""))}</li>)}</ol>;
  }
  if (lines.every((line) => /^\s*>\s?/.test(line))) {
    return <blockquote key={key}>{lines.map((line, index) => <Fragment key={index}>{inline(line.replace(/^\s*>\s?/, ""))}{index < lines.length - 1 && <br />}</Fragment>)}</blockquote>;
  }
  const heading = text.match(/^(#{1,3})\s+(.+)$/);
  if (heading) {
    const Tag = `h${heading[1].length + 2}` as "h3" | "h4" | "h5";
    return <Tag key={key}>{inline(heading[2])}</Tag>;
  }
  return <p key={key}>{lines.map((line, index) => <Fragment key={index}>{inline(line)}{index < lines.length - 1 && <br />}</Fragment>)}</p>;
}

function CodeBlock({ language, code, locale }: { language: string; code: string; locale: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* Clipboard may be unavailable in non-secure contexts. */ }
  }
  return <div className="banmao-ai-code"><header><span>{language}</span><button type="button" onClick={copy} aria-label={aiText(locale, copied ? "codeCopied" : "copyCode")}>{copied ? <Check size={11} /> : <Copy size={11} />}{aiText(locale, copied ? "copied" : "copy")}</button></header><pre><code>{code}</code></pre></div>;
}

export default function MarkdownRenderer({ content, language }: { content: string; language: string }) {
  const blocks = content.replace(/\r\n?/g, "\n").split(/(```[\s\S]*?```)/g);
  return <div className="banmao-ai-markdown">{blocks.flatMap((block, index) => {
    if (!block) return [];
    if (block.startsWith("```")) {
      const match = block.match(/^```([^\n]*)\n?([\s\S]*?)```$/);
      const codeLanguage = match?.[1].trim() || "text";
      const code = match?.[2].replace(/\n$/, "") || "";
      return <CodeBlock key={index} language={codeLanguage} code={code} locale={language} />;
    }
    return block.split(/\n{2,}/).filter(Boolean).map((text, childIndex) => renderTextBlock(text, index * 100 + childIndex));
  })}</div>;
}
