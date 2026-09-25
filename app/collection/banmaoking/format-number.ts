/** Display-only formatting: never convert on-chain amounts through Number. */
export function formatKingNumber(value: string | bigint | number, fractionDigits?: number): string {
  const [integer, fraction = ''] = String(value).split('.');
  const grouped = integer === '6666' ? integer : integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decimals = fractionDigits === undefined ? fraction : fraction.slice(0, fractionDigits);
  return decimals ? `${grouped}.${decimals}` : grouped;
}
