import { ArrowRightLeft, AlertTriangle } from 'lucide-react';
import type { KingCopy } from './i18n';
import { BANMAO_KING_DEPLOYMENT as deployment } from './deployment';
import './banmao-guide.css';

export default function KingBanmaoGuide({ t }: { t: KingCopy }) {
  const address = deployment.paymentToken;
  return <details className="king-banmao-guide">
    <summary><ArrowRightLeft size={14} aria-hidden="true" /> {t.step1BanmaoGuide}</summary>
    <ol><li>{t.step1Sub1}</li><li>{t.step1Sub2}</li><li>{t.step1Sub3}</li></ol>
    <p>{t.payment}: <code>{address}</code></p>
    <p><a href={`https://web3.okx.com/token/x-layer/${address.toLowerCase()}`} target="_blank" rel="noopener noreferrer">OKX Wallet · BANMAO ↗</a></p>
    <p className="king-banmao-warning"><AlertTriangle size={14} aria-hidden="true" /> {t.step1BanmaoWarning}</p>
  </details>;
}
