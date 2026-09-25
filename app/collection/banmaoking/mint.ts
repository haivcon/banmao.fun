import { decodeEventLog, parseAbi, getAddress, isAddress, zeroAddress, type Hash } from "viem";
import { BANMAO_KING_DEPLOYMENT as deployment } from "./deployment";

export const KING_MAX_BATCH_SIZE = 50;
export const kingAddress = deployment.contractAddress as `0x${string}`;
export const paymentAddress = deployment.paymentToken as `0x${string}`;
export const kingAbi = parseAbi([
  "function MAX_BATCH_SIZE() view returns (uint256)",
  "error InvalidQuantity()",
  "error ExceedsMaxSupply()",
  "error SoldOut()",
  "error UnsupportedPaymentToken(address token)",
  "error InexactERC20Payment(uint256 expected, uint256 actual)",
  "error ERC721InvalidReceiver(address receiver)",
  "function totalSupply() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function mintPrice(address) view returns (uint256)",
  "function isPaymentToken(address) view returns (bool)",
  "function mint(address to, address paymentToken) payable returns (uint256)",
  "function mintBatch(address to, address paymentToken, uint256 quantity) payable returns (uint256)",
  "function mintBatchTo(address[] recipients, uint256[] quantities, address paymentToken) payable returns (uint256)",
  "event BatchMinted(address indexed payer, address indexed paymentToken, uint256 firstTokenId, uint256 quantity, uint256 totalPaid)",
  "function tokenURI(uint256) view returns (string)",
  "function refreshMetadata(uint256 tokenId)",
  "event KingMinted(address indexed payer, address indexed to, uint256 indexed tokenId, address paymentToken, uint256 price, uint32 packedTraits)",
]);
export type KingBatchSummary = { firstTokenId: bigint; quantity: bigint; totalPaid: bigint };

/** Validate runtime values too: TypeScript types do not validate receipt/state data. */
export function normalizeKingBatchSummary(value: unknown): KingBatchSummary | undefined {
  if (!value || typeof value !== 'object') return;
  const uint = (input: unknown): bigint | undefined => {
    if (typeof input === 'number' && (!Number.isSafeInteger(input) || input < 0)) return;
    if (typeof input !== 'bigint' && typeof input !== 'number'
      && !(typeof input === 'string' && /^(?:\d{1,78}|0x[\da-fA-F]{1,64})$/.test(input))) return;
    const result = BigInt(input);
    return result >= 0n && result < (1n << 256n) ? result : undefined;
  };
  const record = value as Record<string, unknown>;
  const firstTokenId = uint(record.firstTokenId);
  const quantity = uint(record.quantity);
  const totalPaid = uint(record.totalPaid);
  if (firstTokenId === undefined || firstTokenId < 1n || quantity === undefined
    || quantity < 1n || quantity > BigInt(KING_MAX_BATCH_SIZE) || totalPaid === undefined) return;
  return { firstTokenId, quantity, totalPaid };
}

export function decodeKingBatchSummary(logs: readonly { address: string; data: Hash; topics?: readonly Hash[] }[], payer: string): KingBatchSummary | undefined {
  for (const log of logs) {
    if (!log.topics || log.address.toLowerCase() !== kingAddress.toLowerCase()) continue;
    try {
      const { args } = decodeEventLog({ abi: kingAbi, eventName: 'BatchMinted', data: log.data, topics: [...log.topics] as [Hash, ...Hash[]] });
      if (args.payer.toLowerCase() !== payer.toLowerCase() || args.paymentToken.toLowerCase() !== paymentAddress.toLowerCase()) continue;
      if (args.quantity < 1n || args.quantity > BigInt(KING_MAX_BATCH_SIZE) || args.firstTokenId < 1n) continue;
      const summary = normalizeKingBatchSummary(args);
      if (summary) return summary;
    } catch { /* Ignore unrelated or malformed logs. */ }
  }
}

/** Reconcile receipt evidence only; never manufacture missing token IDs or recipients. */
export function reconcileKingBatch(minted: readonly { id: bigint; to: string }[], summary?: KingBatchSummary) {
  if (minted.some(item => !item || typeof item.id !== 'bigint'
    || item.id < 1n || item.id > BigInt(deployment.maxSupply)
    || typeof item.to !== 'string' || !isAddress(item.to) || item.to.toLowerCase() === zeroAddress)) return 'inconsistent' as const;
  const ids = new Set(minted.map(item => item.id.toString()));
  if (ids.size !== minted.length) return 'inconsistent' as const;
  if (summary === undefined) return 'complete' as const;
  summary = normalizeKingBatchSummary(summary);
  if (!summary || summary.firstTokenId + summary.quantity - 1n > BigInt(deployment.maxSupply)) return 'inconsistent' as const;
  if (summary.totalPaid !== summary.quantity * BigInt(deployment.mintPrice)
    || ids.size !== minted.length || BigInt(minted.length) > summary.quantity
    || minted.some(item => item.id < summary.firstTokenId || item.id >= summary.firstTokenId + summary.quantity)) return 'inconsistent' as const;
  return BigInt(minted.length) === summary.quantity ? 'complete' as const : 'partial' as const;
}

export function kingMintCall(plan: ReturnType<typeof parseKingRecipients>) {
  if (plan.total === 1n) return { functionName: 'mint', args: [plan.recipients[0], paymentAddress] } as const;
  if (!deployment.supportsBatchMint) throw new Error('Batch deployment not verified');
  if (plan.recipients.length === 1) return { functionName: 'mintBatch', args: [plan.recipients[0], paymentAddress, plan.total] } as const;
  return { functionName: 'mintBatchTo', args: [plan.recipients, plan.quantities, paymentAddress] } as const;
}

// Batch capability is deliberately opt-in through the deployment manifest.
export function parseKingRecipients(input: string) {
  const rows = input.trim().split(/\r?\n/);
  if (!input.trim() || rows.length > KING_MAX_BATCH_SIZE) throw new Error("Enter 1–50 recipient rows / Nhập 1–50 dòng người nhận");
  const recipients: `0x${string}`[] = [];
  const quantities: bigint[] = [];
  let total = 0n;
  rows.forEach((row, index) => {
    const parts = row.trim().split(/[,\s]+/);
    if (parts.length !== 2 || !isAddress(parts[0]) || parts[0].toLowerCase() === zeroAddress || !/^[1-9]\d*$/.test(parts[1])) throw new Error(`Invalid recipient or quantity / Ví hoặc số lượng không hợp lệ: ${index + 1}`);
    const quantity = BigInt(parts[1]);
    total += quantity;
    if (total > BigInt(KING_MAX_BATCH_SIZE)) throw new Error("Maximum 50 NFTs / Tối đa 50 NFT");
    recipients.push(getAddress(parts[0])); quantities.push(quantity);
  });
  return { recipients, quantities, total };
}

export function validateMintState(price: bigint, accepted: boolean, supply: bigint, max: bigint) {
  if (!accepted || price !== BigInt(deployment.mintPrice) || max !== BigInt(deployment.maxSupply)) throw new Error("Contract configuration mismatch");
  if (supply >= max) throw new Error("Sold out");
}
export function decodeKingMetadata(uri: string): { name: string; image: string; attributes: { trait_type: string; value: string }[] } {
  const prefix = "data:application/json;base64,";
  if (!uri.startsWith(prefix)) throw new Error("Invalid metadata URI");
  // JSON is UTF-8, whereas atob returns a byte string, not decoded text.
  const bytes = Uint8Array.from(atob(uri.slice(prefix.length)), char => char.charCodeAt(0));
  const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!data || typeof data !== 'object') throw new Error('Invalid metadata');
  if (typeof data.name !== "string" || typeof data.image !== "string" || !data.image.startsWith("data:image/svg+xml;base64,")) throw new Error("Invalid on-chain image");
  return { name: data.name, image: data.image, attributes: Array.isArray(data.attributes) ? data.attributes.filter((a: { trait_type?: unknown; value?: unknown }) => typeof a?.trait_type === "string" && typeof a?.value === "string") : [] };
}
