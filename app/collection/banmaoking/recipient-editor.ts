import { isAddress, zeroAddress } from 'viem';
import { KING_MAX_BATCH_SIZE } from './mint';

export function recipientRows(value: string) {
  return (value || ',1').split('\n').map(row => {
    const [address = '', quantity = ''] = row.split(',');
    return { address, quantity };
  });
}
export function recipientDiagnostics(value: string) {
  const rows = recipientRows(value);
  const seen = new Set<string>();
  let total = 0n;
  const issues = rows.map(row => {
    const validAddress = isAddress(row.address) && row.address.toLowerCase() !== zeroAddress;
    const validQuantity = /^[1-9]\d*$/.test(row.quantity);
    if (validQuantity) total += BigInt(row.quantity);
    const key = row.address.toLowerCase();
    const duplicate = validAddress && seen.has(key);
    if (validAddress) seen.add(key);
    return { validAddress, validQuantity, duplicate };
  });
  return { issues, total, overLimit: total > BigInt(KING_MAX_BATCH_SIZE) || rows.length > KING_MAX_BATCH_SIZE };
}
