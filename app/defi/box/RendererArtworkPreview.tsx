import { getAddress, type Address } from "viem";

export type RendererPreviewAsset = { token: string; amount: bigint; decimals: number; symbol: string };

export function rendererDisplayAmount(amount: bigint, decimals: number): string {
  const unit = 10n ** BigInt(decimals);
  const whole = amount / unit;
  if (whole >= 1_000_000_000_000_000_000n) {
    const digits = whole.toString();
    return `${digits[0]}.${digits.slice(1, 5)}e${digits.length - 1}`;
  }
  const grouped = whole.toLocaleString("en-US");
  if (decimals === 0) return grouped;
  const remainder = amount % unit;
  if (remainder === 0n) return grouped;
  if (decimals === 1) return `${grouped}.${remainder}`;
  const fraction = remainder / (10n ** BigInt(decimals - 2));
  if (fraction === 0n) return whole === 0n ? "<0.01" : `${grouped} + <0.01`;
  return `${grouped}.${fraction.toString().padStart(2, "0")}`;
}

function rendererDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const part = (value: number) => value.toString().padStart(2, "0");
  return `${date.getUTCFullYear()}-${part(date.getUTCMonth() + 1)}-${part(date.getUTCDate())} ${part(date.getUTCHours())}:${part(date.getUTCMinutes())} UTC`;
}

export function RendererArtworkPreview({ assets, creator, createdAt, unlockTime, tier, batchPosition }: {
  assets: RendererPreviewAsset[]; creator?: Address; createdAt: number; unlockTime: number; tier: string; batchPosition?: string;
}) {
  const gold = tier === "LEGENDARY" ? "#F2D98D" : tier === "GOLD" ? "#E6C66E" : tier === "DELUXE" ? "#D8B565" : "#B8954F";
  const seconds = Math.max(0, unlockTime - createdAt);
  const duration = seconds >= 86_400 ? `${Math.floor(seconds / 86_400)} DAYS` : `${Math.floor(seconds / 60)} MINUTES`;
  const wallet = creator ? getAddress(creator) : "CONNECT WALLET TO PREVIEW CREATOR";
  return (
    <svg className="box-renderer-preview" viewBox="0 0 600 600" role="img" aria-label="BanmaoBox sealed treasury preview">
      <defs><linearGradient id="box-preview-bg" x2="0" y2="1"><stop stopColor="#15130E"/><stop offset=".55" stopColor="#090A0D"/><stop offset="1" stopColor="#050609"/></linearGradient><linearGradient id="box-preview-shine" x1="0" x2="1"><stop stopColor="#F4EEDC"/><stop offset=".5" stopColor="#F2D98D"/><stop offset="1" stopColor="#F4EEDC"/></linearGradient></defs>
      <g transform="scale(0.75)">
        <rect width="800" height="800" fill="url(#box-preview-bg)"/><rect x="18" y="18" width="764" height="764" rx="34" fill="none" stroke={gold} strokeOpacity=".38"/><path d="M42 112H758M42 386H758M42 466H758M42 580H758" stroke="#D8B565" strokeOpacity=".22"/>
        <text className="preview-brand" x="50" y="68" fontSize="34" fill="url(#box-preview-shine)">BANMAOBOX</text><text className="preview-label preview-muted" x="50" y="96" fontSize="13">SEALED TREASURY  /  SEALED</text><text className="preview-label preview-muted" x="750" y="48" textAnchor="end" fontSize="11">NFT TOKEN ID</text><text className="preview-mono" x="750" y="84" textAnchor="end" fill={gold} fontSize="25" fontWeight="700">#PENDING</text>
        <g transform="translate(48 146)"><text className="preview-label preview-gold" fontSize="19">ASSET PORTFOLIO / {assets.length}</text><text className="preview-label preview-muted" x="704" textAnchor="end" fontSize="12">AVAILABLE AMOUNT</text>{assets.map((asset,index)=><g key={`${asset.token}-${index}`}><text className="preview-mono preview-white" y={43+index*40} fontSize={asset.symbol.length>14?20:24} fontWeight="700">{asset.symbol}</text><text className="preview-mono" x="704" y={43+index*40} textAnchor="end" fill={gold} fontSize="22" fontWeight="700">{rendererDisplayAmount(asset.amount,asset.decimals)}</text><path d={`M0 ${51+index*40}H704`} stroke={gold} strokeOpacity=".1"/></g>)}</g>
        <g transform="translate(48 414)"><text className="preview-label preview-gold" fontSize="15">UNLOCK TIME</text><text className="preview-mono preview-white" x="704" textAnchor="end" fontSize="20" fontWeight="700">{rendererDateTime(unlockTime)}</text></g>
        <g transform="translate(48 492)"><text className="preview-label preview-gold" fontSize="14">MINTED BY</text><text className="preview-mono preview-white" y="27" fontSize={creator?18:14} fontWeight="700">{wallet}</text><text className="preview-label preview-muted" y="60" fontSize="12">CREATED</text><text className="preview-mono preview-white" x="92" y="60" fontSize="16">{rendererDateTime(createdAt)}</text><text className="preview-label preview-muted" x="472" y="60" fontSize="12">TIME SEAL</text><text className="preview-mono" x="704" y="60" textAnchor="end" fill={gold} fontSize="17" fontWeight="700">{duration}</text></g>
        <text className="preview-label preview-gold" x="48" y="608" fontSize="19">ASSET LEDGER{batchPosition?`  /  BOX ${batchPosition}`:""}</text><text className="preview-label preview-muted" x="48" y="632" fontSize="12">TOKEN CONTRACT</text><text className="preview-label preview-muted" x="560" y="632" textAnchor="end" fontSize="12">AMOUNT</text><text className="preview-label preview-muted" x="752" y="632" textAnchor="end" fontSize="12">SYMBOL / DECIMALS</text>
        {assets.map((asset,index)=><g key={`ledger-${asset.token}-${index}`}><text className="preview-mono preview-white" x="48" y={654+index*25} fontSize="12" fontWeight="700">{getAddress(asset.token as Address)}</text><text className="preview-mono preview-white" x="560" y={654+index*25} textAnchor="end" fontSize="14" fontWeight="700">{rendererDisplayAmount(asset.amount,asset.decimals)}</text><text className="preview-mono preview-white" x="752" y={654+index*25} textAnchor="end" fontSize="13">{asset.symbol} / d{asset.decimals}</text><path d={`M48 ${662+index*25}H752`} stroke="#D8B565" strokeOpacity=".12"/></g>)}
      </g>
    </svg>
  );
}
