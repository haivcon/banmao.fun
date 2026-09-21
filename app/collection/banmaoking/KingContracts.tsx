"use client";
import { useEffect, useState } from 'react';
import { xLayerExplorerUrl } from "../../../lib/explorer";
import { copyKingAddress } from "./king-notifications";
import { KING_CONTRACTS } from "./contract-directory";
import { BANMAO_KING_DEPLOYMENT } from "./deployment";
import { KING_T, type Lang } from "./i18n";
import { contractDescription, directoryCopy } from "./i18n/contract-directory";
export default function KingContracts({ lang, isVi }: { lang?: Lang; isVi?: boolean }) {
  const language = lang ?? (isVi ? "vi" : "en");
  const t = KING_T[language];
  const vi = language === 'vi';
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [target, setTarget] = useState('');
  const [page, setPage] = useState(0);
  const [openName, setOpenName] = useState('');
  const pageSize = 8;
  const shortAddress = (address: string) => `${address.slice(0, 8)}…${address.slice(-6)}`;
  const navigateTo = (name: string) => {
    const index = KING_CONTRACTS.findIndex(contract => contract.name === name);
    if (index < 0) return;
    setExpanded(true); setQuery(''); setCategory('all');
    setPage(Math.max(0, Math.floor((index - 2) / pageSize)));
    setOpenName(name); setTarget(`contract-${name}`);
  };
  const resetPage = () => { setTarget(''); setPage(0); setOpenName(''); };
  const categories = ['all', 'Body', 'Expression', 'Accessory', 'Background', 'Motion', 'Identity'];
  const technical = KING_CONTRACTS.slice(2);
  const filtered = technical.filter(contract => (category === 'all' || contract.name.includes(category)) && `${contract.name} ${contract.address} ${contractDescription(contract, language)}`.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => {
    const followHash = () => {
      const id = window.location.hash.slice(1);
      const index = KING_CONTRACTS.findIndex(contract => `contract-${contract.name}` === id);
      if (index < 0) return;
      setExpanded(true); setQuery(''); setCategory('all'); setTarget(id);
      setPage(Math.max(0, Math.floor((index - 2) / pageSize))); setOpenName(KING_CONTRACTS[index].name);
    };
    followHash();
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, []);
  useEffect(() => {
    if (!target || !expanded) return;
    const frame = requestAnimationFrame(() => {
      const node = document.getElementById(target);
      node?.scrollIntoView({ block: 'start' });
      node?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [target, expanded, query, category, page]);
  const copy = (address: string) => copyKingAddress(address, language);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const card = (contract: typeof KING_CONTRACTS[number], primary = false) => {
    const open = openName === contract.name;
    const explorer = xLayerExplorerUrl(contract.address.toLowerCase() === BANMAO_KING_DEPLOYMENT.contractAddress.toLowerCase() ? "token" : "address", contract.address, language);
    return <article tabIndex={-1} className={primary ? 'king-contract-compact king-contract-primary' : 'king-contract-compact'} id={`contract-${contract.name}`} key={contract.address}>
      <div className="king-contract-line">
        <button type="button" className="king-contract-disclosure" aria-expanded={open} aria-controls={`details-${contract.name}`} onClick={() => { setTarget(''); setOpenName(open ? '' : contract.name); }}>
          <span>{contract.name}</span><span aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
        <code className="king-contract-short" title={contract.address}>{shortAddress(contract.address)}</code>
        <div className="king-contract-actions">
          <button type="button" aria-label={`${t.copy} — ${contract.name}`} title={t.copy} onClick={() => void copy(contract.address)}><span aria-hidden="true">⧉</span></button>
          <a href={explorer} target="_blank" rel="noopener noreferrer" aria-label={`${contract.name} — ${t.explorer}`} title={t.explorer}><span aria-hidden="true">↗</span></a>
        </div>
      </div>
      {open && <div id={`details-${contract.name}`} className="king-contract-detail">
        <span className="king-contract-label">{contract.reused ? t.reused : t.newContract}</span>
        <p>{contractDescription(contract, language)}</p>
        <a className="king-contract-full" href={explorer} target="_blank" rel="noopener noreferrer"><code>{contract.address}</code> ↗</a>
        {contract.dependencies.length > 0 && <div className="king-contract-dependencies"><p>{directoryCopy[language].dependencies}</p><div>{contract.dependencies.map(name => <a key={name} href={`#contract-${name}`} onClick={() => navigateTo(name)}>{name}</a>)}</div></div>}
      </div>}
    </article>;
  };
  return <section id="king-contracts" className="king-section king-contracts" aria-labelledby="king-contracts-title">
    <span className="king-eyebrow">X LAYER · 196</span><h2 id="king-contracts-title">{t.contracts} · {KING_CONTRACTS.length}</h2><p>{directoryCopy[language].intro}</p><div className="king-notice">{t.safety}</div>
    <div className="king-contract-primary-grid">{KING_CONTRACTS.slice(0, 2).map(contract => card(contract, true))}</div>
    <button className="king-directory-toggle" type="button" aria-expanded={expanded} aria-controls="king-technical-directory" onClick={() => { setTarget(''); setExpanded(value => !value); }}>{t.technical} · {technical.length} <span aria-hidden="true">{expanded ? '−' : '+'}</span></button>
    {expanded && <div id="king-technical-directory" className="king-directory-panel">
      <div className="king-directory-toolbar"><label>{vi ? 'Tìm tên, địa chỉ hoặc mô tả' : 'Search name, address or description'}<input type="search" value={query} onChange={event => { resetPage(); setQuery(event.target.value); }} /></label>
      <label>{vi ? 'Nhóm contract' : 'Contract category'}<select value={category} onChange={event => { resetPage(); setCategory(event.target.value); }}>{categories.map(value => <option key={value} value={value}>{value === 'all' ? (vi ? 'Tất cả' : 'All contracts') : value}</option>)}</select></label></div>
      <p className="king-directory-count" role="status">{filtered.length ? `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, filtered.length)} / ${filtered.length}` : '0'} {t.contracts}</p>
      {filtered.length ? <>
        <div className="king-contract-list">{visible.map(contract => card(contract))}</div>
        <nav className="king-directory-pagination" aria-label={vi ? 'Phân trang hợp đồng' : 'Contract pagination'}>
          <button type="button" disabled={currentPage === 0} onClick={() => { setTarget(''); setOpenName(''); setPage(currentPage - 1); }}>{vi ? '← Trước' : '← Previous'}</button>
          <span>{vi ? 'Trang' : 'Page'} {currentPage + 1} / {pageCount}</span>
          <button type="button" disabled={currentPage + 1 >= pageCount} onClick={() => { setTarget(''); setOpenName(''); setPage(currentPage + 1); }}>{vi ? 'Sau →' : 'Next →'}</button>
        </nav>
      </> : <div className="king-directory-empty"><p>{vi ? 'Không tìm thấy contract phù hợp.' : 'No matching contracts.'}</p><button type="button" className="king-copy-button" onClick={() => { resetPage(); setQuery(''); setCategory('all'); }}>{vi ? 'Xóa bộ lọc' : 'Clear filters'}</button></div>}
    </div>}
    <footer className="king-contract-footer">
      <div><span>{t.payment}</span><a href={xLayerExplorerUrl("token", BANMAO_KING_DEPLOYMENT.paymentToken, language)} target="_blank" rel="noopener noreferrer" title={BANMAO_KING_DEPLOYMENT.paymentToken}><code>{shortAddress(BANMAO_KING_DEPLOYMENT.paymentToken)}</code> ↗</a><button type="button" onClick={() => void copy(BANMAO_KING_DEPLOYMENT.paymentToken)} aria-label={`${t.copy} — ${t.payment}`}>{t.copy}</button></div>
      <p>{t.royalty}</p>
    </footer>
  </section>;
}
