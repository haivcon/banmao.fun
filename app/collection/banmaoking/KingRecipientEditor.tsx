"use client";
import { kingRecipientCopy } from './i18n/recipients';
import { useId, useRef, useState } from 'react';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import { parseKingRecipients } from './mint';
import { recipientDiagnostics, recipientRows } from './recipient-editor';
import type { Lang } from './i18n';

export default function KingRecipientEditor({ value, onChange, lang }: { value: string; onChange: (value: string) => void; lang: Lang }) {
  const prefix = useId();
  const [bulk, setBulk] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const rows = recipientRows(value);
  const { issues, total, overLimit } = recipientDiagnostics(value);
  function focusRow(index: number) {
    requestAnimationFrame(() => {
      const input = container.current?.querySelectorAll<HTMLInputElement>('[data-recipient-address]')[index];
      input?.focus({ preventScroll: true });
      input?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
  }
  function update(index: number, field: 'address' | 'quantity', next: string) {
    onChange(rows.map((row, i) => {
      const updated = i === index ? { ...row, [field]: next.replace(/[\r\n,]/g, '') } : row;
      return `${updated.address},${updated.quantity}`;
    }).join('\n'));
  }
  function apply() {
    try {
      const plan = parseKingRecipients(draft);
      onChange(plan.recipients.map((address, i) => `${address},${plan.quantities[i]}`).join('\n'));
      setBulk(false); setError('');
    } catch {
      setError(kingRecipientCopy(lang, "Check every address and quantity. Maximum 50 NFTs in total; zero addresses are not allowed."));
    }
  }
  return <div className="king-recipient-editor" ref={container}>
    <div className="king-recipient-editor-toolbar"><strong>{kingRecipientCopy(lang, "Recipient list")}</strong><span aria-live="polite">{total.toString()} / 50 NFT</span></div>
    <button type="button" className="king-recipient-tool" aria-expanded={bulk} onClick={() => { setBulk(!bulk); setDraft(value); setError(''); }}><ClipboardList size={16} aria-hidden="true" />{bulk ? (kingRecipientCopy(lang, "Close paste editor")) : (kingRecipientCopy(lang, "Paste a list"))}</button>
    {bulk && <div className="king-recipient-bulk">
      <label className="king-recipient-field" htmlFor={`${prefix}-bulk`}>{kingRecipientCopy(lang, "One row: address, quantity")}<textarea id={`${prefix}-bulk`} rows={5} value={draft} onChange={e => { setDraft(e.target.value); setError(''); }} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={!!error} aria-describedby={`${prefix}-bulk-help`} /></label>
      <p id={`${prefix}-bulk-help`}>{kingRecipientCopy(lang, "Apply replaces the list below. Unapplied text is not used for minting.")}</p>
      {error && <p className="king-recipient-error" role="alert">{error}</p>}
      <button type="button" className="king-recipient-tool" onClick={apply}>{kingRecipientCopy(lang, "Apply list")}</button>
    </div>}
    <div className="king-recipient-edit-rows">{rows.map((row, i) => <div className="king-recipient-edit-row" key={i}>
      <label className="king-recipient-field">{kingRecipientCopy(lang, "Recipient")} {i + 1}<input data-recipient-address value={row.address} onChange={e => update(i, 'address', e.target.value.trim())} placeholder="0x…" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={!!row.address && !issues[i].validAddress} aria-describedby={`${prefix}-${i}-help`} /></label>
      <label className="king-recipient-field">NFT<input type="number" inputMode="numeric" min="1" max="50" value={row.quantity} onChange={e => update(i, 'quantity', e.target.value)} aria-invalid={!issues[i].validQuantity || Number(row.quantity) > 50} aria-describedby={`${prefix}-${i}-help`} /></label>
      <button type="button" className="king-recipient-tool" disabled={rows.length === 1} aria-label={`${kingRecipientCopy(lang, "Remove recipient")} ${i + 1}`} onClick={() => {
        onChange(rows.filter((_, index) => index !== i).map(item => `${item.address},${item.quantity}`).join('\n'));
        focusRow(Math.max(0, i - 1));
      }}><Trash2 size={16} aria-hidden="true" /></button>
      <small id={`${prefix}-${i}-help`} className="king-recipient-row-help">{row.address && !issues[i].validAddress ? (kingRecipientCopy(lang, "Invalid address.")) : !issues[i].validQuantity || Number(row.quantity) > 50 ? (kingRecipientCopy(lang, "Enter a whole number from 1 to 50.")) : issues[i].duplicate ? (kingRecipientCopy(lang, "Repeated wallet. Please review; rows are not merged.")) : issues[i].validAddress ? (kingRecipientCopy(lang, "Valid format — verify the intended recipient.")) : (kingRecipientCopy(lang, "Enter a full EVM address."))}</small>
    </div>)}</div>
    {overLimit && <p className="king-recipient-error" role="alert">{kingRecipientCopy(lang, "The total exceeds the 50 NFT limit.")}</p>}
    <button type="button" className="king-recipient-tool" disabled={rows.length >= 50} onClick={() => {
      onChange(`${value || ',1'}\n,1`);
      focusRow(rows.length);
    }}><Plus size={16} aria-hidden="true" />{kingRecipientCopy(lang, "Add recipient")}</button>
  </div>;
}
