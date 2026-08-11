import { createHash } from "node:crypto";

export type CorpusDocument = { documentId: string; version: string; sourcePath: string; content: string };
export type IndexedChunk = CorpusDocument & { chunkId: string; contentHash: string; chunkIndex: number };

function chunkContent(content: string, maxChars = 1800): string[] {
  const paragraphs = content.replace(/\r\n/g, "\n").split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      if (current) { chunks.push(current); current = ""; }
      for (let offset = 0; offset < paragraph.length; offset += maxChars) chunks.push(paragraph.slice(offset, offset + maxChars));
    } else if (!current) current = paragraph;
    else if (current.length + paragraph.length + 2 <= maxChars) current += `\n\n${paragraph}`;
    else { chunks.push(current); current = paragraph; }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function buildIndex(docs: CorpusDocument[]): IndexedChunk[] {
  return docs.flatMap((document) => chunkContent(document.content).map((content, chunkIndex) => {
    const contentHash = createHash("sha256").update(content).digest("hex");
    return {
      ...document,
      content,
      contentHash,
      chunkIndex,
      chunkId: `${document.documentId}:${document.version}:${chunkIndex}:${contentHash.slice(0, 16)}`,
    };
  })).sort((a, b) => a.chunkId.localeCompare(b.chunkId));
}
