'use client';

import { useEffect, useState } from 'react';
import type { PublicClient } from 'viem';
import type { Lang } from './i18n';
import { kingLookupCopy as copy } from './i18n/lookup';
import { kingAbi, kingAddress } from './mint';
import { contractSvgDocument, contractSvgImage } from './contract-svg';
import { parseKingId } from './identity';

export default function KingContractSvg({ client, metadata, lang }: {
  client?: PublicClient; metadata?: { id: bigint; blockNumber: bigint; image: string }; lang: Lang;
}) {
  const [input, setInput] = useState('');
  const [request, setRequest] = useState<{ tokenId: bigint; blockNumber?: bigint; image?: string }>();
  const [invalid, setInvalid] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [result, setResult] = useState<{ tokenId: bigint; blockNumber: bigint; svg: string; image: string; matches?: boolean }>();
  useEffect(() => {
    if (!request || !client) return;
    let active = true;
    async function read() {
      const blockNumber = request!.blockNumber ?? await client!.getBlockNumber();
      const svg = await client!.readContract({
        authorizationList: undefined, address: kingAddress, abi: kingAbi,
        functionName: 'renderSVG', args: [request!.tokenId], blockNumber,
      });
      const image = contractSvgImage(svg);
      if (active) {
        setResult({ tokenId: request!.tokenId, blockNumber, svg, image, matches: request!.image === undefined ? undefined : image === request!.image });
        setStatus('ready');
      }
    }
    void read().catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [attempt, client, request]);

  return <div className="king-contract-svg">
    <h4>{copy(lang, 'Direct contract SVG')}</h4>
    <p>{copy(lang, 'Read-only RPC call. No wallet or gas payment required.')}</p>
    <form className="king-wallet-row" onSubmit={event => {
      event.preventDefault();
      if (!client || status === 'loading') return;
      let tokenId: bigint;
      try { tokenId = parseKingId(input); } catch { setInvalid(true); return; }
      setInvalid(false); setResult(undefined); setStatus('loading');
      setRequest({ tokenId, ...(metadata?.id === tokenId ? { blockNumber: metadata.blockNumber, image: metadata.image } : {}) });
      setAttempt(n => n + 1);
    }}>
      <div className="king-preview-token-control">
        <label htmlFor="king-svg-token-input">{copy(lang, 'NFT ID')} · renderSVG</label>
        <input id="king-svg-token-input" value={input} onChange={event => { setInput(event.target.value); setInvalid(false); }} placeholder={copy(lang, 'Example: 42')} inputMode="numeric" disabled={status === 'loading'} aria-invalid={invalid} aria-describedby="king-svg-input-help" />
        <small id="king-svg-input-help">{copy(lang, 'Enter an ID from 1, optionally with #. Press Enter to search.')}</small>
      </div>
      <button type="submit" className="king-nft-action king-nft-action-featured" disabled={!client || status === 'loading'} aria-busy={status === 'loading'}>{copy(lang, 'Read renderSVG')}</button>
    </form>
    {invalid && <p role="alert">{copy(lang, 'Invalid token ID. Enter a whole number from 1.')}</p>}
    <p role="status">{status === 'loading' ? copy(lang, 'Reading blockchain…') : status === 'error' ? copy(lang, 'SVG read failed. The RPC may limit large responses. Retry.') : result && result.matches !== undefined ? copy(lang, result.matches ? 'SVG matches metadata exactly.' : 'Warning: SVG differs from metadata.') : ''}</p>
    {result && <>
      <p>Block: {result.blockNumber.toString()} · renderSVG({result.tokenId.toString()})</p>
      {/* Keep RPC markup in an opaque-origin document, never the parent DOM.
          Do not add allow-scripts or allow-same-origin to this sandbox. */}
      <iframe sandbox="" srcDoc={contractSvgDocument(result.svg)} title={`Banmao King #${result.tokenId} — renderSVG`} referrerPolicy="no-referrer" tabIndex={-1} width={512} height={512} style={{ display: 'block', width: '100%', maxWidth: 512, height: 'auto', aspectRatio: '1', border: 0, pointerEvents: 'none' }} />
      <div className="king-nft-actions"><a className="king-nft-action" href={result.image} download={`BanmaoKing-${result.tokenId}-renderSVG.svg`}>{copy(lang, 'Download original on-chain SVG')}</a></div>
      <details><summary>{copy(lang, 'SVG source')}</summary>
        <textarea aria-label={copy(lang, 'SVG source')} readOnly value={result.svg} rows={10} spellCheck={false} style={{ width: '100%', fontFamily: 'monospace' }} />
      </details>
    </>}
  </div>;
}
