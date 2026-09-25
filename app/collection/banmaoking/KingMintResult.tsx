"use client";
import { useId, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Clock3, Copy, ExternalLink } from 'lucide-react';
import { KING_T, type Lang } from './i18n';
import { MINT_RESULT_COPY } from './i18n/mint-result';
import { groupMintResults, type MintedKing, type MintResultState } from './mint-result';
import { copyKingAddress } from './king-notifications';
import { xLayerExplorerUrl } from '../../../lib/explorer';
import './mint-result.css';
import { formatUnits } from 'viem';
import { formatKingNumber } from './format-number';
import { kingAddress, reconcileKingBatch, type KingBatchSummary } from './mint';
import type { ReceiptEvidence } from './receipt-evidence';
import { RECEIPT_COPY } from './i18n/receipt';
import { RECEIPT_GUIDANCE } from './i18n/receipt-guidance';
import { kingCheckoutCopy } from './i18n/checkout';

export default function KingMintResult({ lang, status, minted, batchSummary, hash, message, tokenId, onSelect, evidence: verified, payer, fee, onRetry, children }: {
  children?: ReactNode;
  evidence?: ReceiptEvidence; payer?: string; fee?: bigint; onRetry?: () => void;
  lang: Lang; status: MintResultState; minted: MintedKing[]; hash?: string; message: string;
  tokenId?: bigint; batchSummary?: KingBatchSummary; onSelect: (id: bigint) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const copy = MINT_RESULT_COPY[lang];
  const t = KING_T[lang];
  const receiptCopy = RECEIPT_COPY[lang];
  const guidance = RECEIPT_GUIDANCE[lang];
  const evidence = reconcileKingBatch(minted, batchSummary) === 'inconsistent' ? 'inconsistent' : verified?.state ?? 'partial';
  const isReceipt = status === 'success' || status === 'unresolved';
  const incomplete = isReceipt && evidence !== 'complete';
  const groups = isReceipt && evidence === 'complete' ? groupMintResults(minted) : [];
  const total = groups.reduce((n, group) => n + group.ids.length, 0);
  const showPreview = Boolean(children) && tokenId !== undefined && groups.some(group => group.ids.includes(tokenId));
  const [title, description] = copy.states[status];
  const positive = ['success', 'approved', 'reset'].includes(status);
  const negative = ['error', 'reverted'].includes(status);
  const Icon = positive ? CheckCircle2 : negative ? AlertCircle : Clock3;
  return <section className="king-transaction-result" data-tone={incomplete ? 'warning' : positive ? 'success' : negative ? 'error' : 'neutral'} aria-label={incomplete ? guidance.confirmed : title}>
    <div className="king-result-heading" role="status" aria-live="polite" aria-atomic="true">
      <Icon size={28} aria-hidden="true" />
      <div><h3>{incomplete ? guidance.confirmed : title}</h3><p>{incomplete ? receiptCopy.incomplete : status === 'success' && groups.length > 0 ? copy.summary(total, groups.length) : description}</p></div>
    </div>
    {status === 'error' && message && <p className="king-result-error">{message}</p>}
    <div className="king-result-body" data-preview={showPreview}>
    {showPreview && <div className="king-result-preview" aria-label={`${guidance.viewing} #${tokenId}`}>{children}</div>}
    <div className="king-result-information">
    {(isReceipt || hash) && <div className="king-receipt-summary">
      <dl>
        {isReceipt && <>
        <div><dt>NFT</dt><dd>{incomplete ? receiptCopy.unknown : total}</dd></div>
        <div><dt>{receiptCopy.wallets}</dt><dd>{incomplete ? receiptCopy.unknown : groups.length}</dd></div>
        <div><dt>{guidance.payment}</dt><dd>{!incomplete && verified?.totalPaid !== undefined ? `${formatKingNumber(formatUnits(verified.totalPaid, 18))} BANMAO` : receiptCopy.unknown}</dd></div>
        <div><dt>{guidance.verification}</dt><dd>{incomplete ? receiptCopy.unknown : receiptCopy.verified}</dd></div>
        </>}
        {hash && <>
          <div><dt>{guidance.fee}</dt><dd>{fee === undefined ? guidance.unavailable : `${formatUnits(fee, 18)} OKB`}</dd></div>
          <div><dt>X Layer</dt><dd>Chain ID · 196</dd></div>
          {payer && <div className="king-receipt-wide"><dt>{receiptCopy.payer}</dt><dd><a href={xLayerExplorerUrl('address', payer, lang)} target="_blank" rel="noopener noreferrer"><code>{payer}</code><ExternalLink size={14} aria-hidden="true" /></a></dd></div>}
          <div className="king-receipt-wide"><dt>{t.contracts} · NFT</dt><dd><a href={xLayerExplorerUrl('address', kingAddress, lang)} target="_blank" rel="noopener noreferrer"><code>{kingAddress}</code><ExternalLink size={14} aria-hidden="true" /></a></dd></div>
        </>}
      </dl>
      {isReceipt && <small>{kingCheckoutCopy(lang, 'OKB gas is separate')}</small>}
      {incomplete && <p>{guidance.readOnly}</p>}
    </div>}
    {groups.length > 0 && <>
      <p>{guidance.delivery}</p><p>{copy.view}{showPreview && <> · {guidance.viewing} #{tokenId?.toString()}</>}</p>
      <ul id={listId} className="king-result-wallets" aria-label={copy.recipients}>
        {(expanded ? groups : groups.slice(0, 3)).map(group => <li key={group.to.toLowerCase()}>
          <div className="king-result-wallet-heading">
            <a href={xLayerExplorerUrl('address', group.to, lang)} target="_blank" rel="noopener noreferrer" title={group.to}><code>{group.to.slice(0, 6)}…{group.to.slice(-4)}</code><ExternalLink size={14} aria-hidden="true" /></a>
            <button type="button" onClick={() => void copyKingAddress(group.to, lang)} aria-label={`${t.copy}: ${group.to}`}><Copy size={16} aria-hidden="true" /></button>
            <strong>{group.ids.length} NFT</strong>
          </div>
          <details><summary>{guidance.fullAddress}</summary><code className="king-result-full-address">{group.to}</code></details>
          <div className="king-result-token-buttons">{group.ids.map(id => <button key={id.toString()} type="button" aria-pressed={tokenId === id} aria-label={`${copy.view} #${id}`} onClick={() => onSelect(id)}>#{id.toString()}</button>)}</div>
        </li>)}
      </ul>
      {groups.length > 3 && <button type="button" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(value => !value)}>{expanded ? copy.less : `${copy.all} (${groups.length})`}</button>}
    </>}
    </div>
    </div>
    {(hash || (incomplete && onRetry)) && <footer className="king-result-footer">
      {hash && <a href={xLayerExplorerUrl('tx', hash, lang)} target="_blank" rel="noopener noreferrer"><span>{t.transaction}</span><code>{hash}</code><ExternalLink size={16} aria-hidden="true" /></a>}
      {incomplete && onRetry && <button type="button" onClick={onRetry}>{guidance.retry}</button>}
    </footer>}
  </section>;
}
