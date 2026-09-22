export const kingTaskIds = ['king-studio', 'king-mint', 'king-lookup'] as const;
export type KingTask = typeof kingTaskIds[number];
export function kingTaskFromLocation(hash: string, search: string): KingTask {
  if (hash === '#king-mint' || hash === '#king-guide' || hash === '#king-faq') return 'king-mint';
  if (hash === '#king-lookup') return 'king-lookup';
  if (hash === '#king-studio') return 'king-studio';
  return new URLSearchParams(search).has('token') ? 'king-lookup' : 'king-studio';
}
