import { decodeEventLog, decodeFunctionData, toEventSelector, type Hash } from 'viem';
import { kingAbi, kingAddress, paymentAddress, normalizeKingBatchSummary, reconcileKingBatch, KING_MAX_BATCH_SIZE } from './mint';
import { BANMAO_KING_DEPLOYMENT as deployment } from './deployment';

type Log = { address: string; data: Hash; topics?: readonly Hash[] };
type Transaction = { to: string | null; from: string; input: Hash };
export type ReceiptEvidence = {
  state: 'complete' | 'partial' | 'inconsistent';
  minted: { to: string; id: bigint }[];
  totalPaid?: bigint;
};
const batchTopic = toEventSelector('BatchMinted(address,address,uint256,uint256,uint256)');
const itemTopic = toEventSelector('KingMinted(address,address,uint256,address,uint256,uint32)');
export function verifyKingReceipt(logs: readonly Log[], transaction?: Transaction): ReceiptEvidence {
  const fail = (state: ReceiptEvidence['state']): ReceiptEvidence => ({ state, minted: [] });
  if (!transaction) return fail('partial');
  if (transaction.to?.toLowerCase() !== kingAddress.toLowerCase()) return fail('inconsistent');
  try {
    const call = decodeFunctionData({ abi: kingAbi, data: transaction.input });
    let recipients: readonly string[];
    let quantities: readonly bigint[];
    let token: string;
    if (call.functionName === 'mint') {
      recipients = [call.args[0]]; quantities = [1n]; token = call.args[1];
    } else if (call.functionName === 'mintBatch') {
      recipients = [call.args[0]]; quantities = [call.args[2]]; token = call.args[1];
    } else if (call.functionName === 'mintBatchTo') {
      [recipients, quantities, token] = call.args;
    } else return fail('inconsistent');
    const quantity = quantities.reduce((sum, value) => sum + value, 0n);
    if (token.toLowerCase() !== paymentAddress.toLowerCase() || recipients.length !== quantities.length
      || quantities.some(value => value < 1n) || quantity < 1n || quantity > BigInt(KING_MAX_BATCH_SIZE)) return fail('inconsistent');
    const expected = recipients.flatMap((to, index) => Array.from({ length: Number(quantities[index]) }, () => to.toLowerCase()));
    const minted: ReceiptEvidence['minted'] = [];
    let batch: { state: 'absent' } | { state: 'valid'; summary: NonNullable<ReturnType<typeof normalizeKingBatchSummary>> } = { state: 'absent' };
    for (const log of logs) {
      if (log.address.toLowerCase() !== kingAddress.toLowerCase()) continue;
      if (!log.topics) return fail('partial');
      if (log.topics[0] !== itemTopic && log.topics[0] !== batchTopic) continue;
      const event = log.topics[0] === itemTopic
        ? decodeEventLog({ abi: kingAbi, eventName: 'KingMinted', data: log.data, topics: [...log.topics] as [Hash, ...Hash[]] })
        : decodeEventLog({ abi: kingAbi, eventName: 'BatchMinted', data: log.data, topics: [...log.topics] as [Hash, ...Hash[]] });
      if (event.eventName !== 'KingMinted' && event.eventName !== 'BatchMinted') continue;
      if (event.args.payer.toLowerCase() !== transaction.from.toLowerCase()
        || event.args.paymentToken.toLowerCase() !== token.toLowerCase()) return fail('inconsistent');
      if (event.eventName === 'KingMinted') {
        if (event.args.price !== BigInt(deployment.mintPrice)) return fail('inconsistent');
        minted.push({ to: event.args.to, id: event.args.tokenId });
      } else {
        const summary = normalizeKingBatchSummary(event.args);
        if (!summary || batch.state !== 'absent') return fail('inconsistent');
        batch = { state: 'valid', summary };
      }
    }
    const summary = batch.state === 'valid' ? batch.summary : undefined;
    if (reconcileKingBatch(minted, summary) === 'inconsistent' || minted.length > expected.length
      || (summary && summary.quantity !== quantity)) return fail('inconsistent');
    if (call.functionName === 'mint' && summary) return fail('inconsistent');
    if (minted.length !== expected.length || (call.functionName !== 'mint' && !summary)) return fail('partial');
    const ordered = [...minted].sort((a, b) => a.id < b.id ? -1 : 1);
    if (ordered.some((item, index) => item.to.toLowerCase() !== expected[index]
      || (index > 0 && item.id !== ordered[index - 1].id + 1n))) return fail('inconsistent');
    return { state: 'complete', minted: ordered, totalPaid: quantity * BigInt(deployment.mintPrice) };
  } catch { return fail('inconsistent'); }
}
