"use client";
import { KING_T, type Lang } from './i18n';
import { useKingSupply } from './useKingSupply';
import { BANMAO_KING_DEPLOYMENT as deployment } from './deployment';
import { formatUnits } from 'viem';
import './supply.css';
import { formatKingNumber } from './format-number';

const copy = {
  en: ['NFTs minted', 'Max supply', 'remaining', 'Unable to update'],
  vi: ['NFT đã mint', 'Tổng cung tối đa', 'còn lại', 'Chưa cập nhật được'],
  zh: ['已铸造 NFT', '最大供应量', '剩余', '无法更新'],
  ko: ['민팅된 NFT', '최대 공급량', '남음', '업데이트 불가'],
  ru: ['NFT выпущено', 'Макс. предложение', 'осталось', 'Не удалось обновить'],
  id: ['NFT dicetak', 'Suplai maksimum', 'tersisa', 'Gagal memperbarui'],
} satisfies Record<Lang, string[]>;

export default function KingSupply({ lang }: { lang: Lang }) {
  const { data, isError, isFetching, refetch } = useKingSupply();
  const [minted, maximum, remaining, failed] = copy[lang];
  const number = { format: formatKingNumber };
  const ratio = data && data.max > 0n ? Math.min(100, Number(data.supply * 10000n / data.max) / 100) : 0;
  const percent = new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 2 });
  const progress = data ? (data.supply > 0n && ratio === 0 ? `<${percent.format(0.0001)}` : percent.format(ratio / 100)) : '—';
  const t = KING_T[lang];
  const price = number.format(Number(formatUnits(BigInt(deployment.mintPrice), 18)));
  return <section className="king-supply" aria-label={t.collection}>
    <div className="king-supply-detail">
      <div className="king-supply-label">{minted}</div>
      <div className="king-supply-count">
        <strong>{data ? number.format(data.supply) : '—'}</strong>
        <span aria-label={`${maximum}: ${data ? number.format(data.max) : '—'}`}>/ {data ? number.format(data.max) : '—'}</span>
      </div>
      <div className="king-supply-track" role="progressbar" aria-label={minted} aria-valuemin={0} aria-valuemax={100} aria-valuenow={data ? ratio : undefined} aria-valuetext={data ? `${number.format(data.supply)} / ${number.format(data.max)}` : t.loading}><span style={{ width: `${ratio}%` }} /></div>
      <div className="king-supply-meta"><span className="king-supply-percent">{progress}</span><span aria-hidden="true">·</span><span>{data ? `${number.format(data.max > data.supply ? data.max - data.supply : 0n)} ${remaining}` : t.loading}</span></div>
    </div>
    <div className="king-supply-checkout">
      <div className="king-supply-price">
        <span className="king-supply-label">{t.price} / NFT</span>
        <strong>{price} <span className="king-supply-currency">BANMAO</span></strong>
      </div>
      <div className="king-supply-actions"><a className="king-primary-link" href="#king-mint">{t.mint} ↗</a></div>
    </div>
    {isError && <div className="king-supply-error" role="status">{failed} <button type="button" disabled={isFetching} onClick={() => { void refetch(); }}>{KING_T[lang].retry}</button></div>}
  </section>;
}
