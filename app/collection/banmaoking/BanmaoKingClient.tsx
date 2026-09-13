"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const reducedMotionSnapshot = () => window.matchMedia(motionQuery).matches;
const serverReducedMotionSnapshot = () => true;
import KingMint from "./KingMint";
import { ConnectButton } from "../../components/wallet/WalletConnection";
import { BANMAO_KING_DEPLOYMENT } from "./deployment";
import {
  ACTION_NAMES,
  actionIndex,
  actionShadowSvg,
  actionTransform,
  bodySvg,
  expressionSvg,
} from "./artwork";
import {
  ACCESSORY_TRAITS,
  BACKGROUND_TRAITS,
  BODY_TRAITS,
  EXPRESSION_TRAITS,
  TOTAL_COMBINATIONS,
  type BanmaoKingTraitSelection,
} from "./traits";
import { animatedExpressionSvg } from "./motion";
import { tokenBadgeSvg } from "./badge";
import "./banmaoking.css";
import { ACCESSORY_SVGS, BACKGROUND_SVGS, accessoryRearSvg } from "./scene";

const INITIAL_TRAITS: BanmaoKingTraitSelection = {
  body: 0,
  expression: 0,
  accessory: 0,
  background: 0,
};
type Language = "vi" | "en";
type TraitKey = keyof BanmaoKingTraitSelection;

function BackgroundLayer({ id }: { id: number }) {
  return <g dangerouslySetInnerHTML={{ __html: BACKGROUND_SVGS[id] }} />;
}

function ExpressionLayer({ id, animated }: { id: number; animated: boolean }) {
  return (
    <g dangerouslySetInnerHTML={{ __html: animated ? animatedExpressionSvg(id) : expressionSvg(id) }} />
  );
}

function AccessoryLayer({ id }: { id: number }) {
  return <g dangerouslySetInnerHTML={{ __html: ACCESSORY_SVGS[id] }} />;
}

function BananaCatBody({
  color,
  shade,
  tokenId,
}: {
  color: string;
  shade: string;
  tokenId: number;
}) {
  return (
    <g dangerouslySetInnerHTML={{ __html: bodySvg(color, shade, tokenId) }} />
  );
}

function KingArtwork({
  traits,
  tokenId,
  animated,
}: {
  traits: BanmaoKingTraitSelection;
  tokenId: number;
  animated: boolean;
}) {
  const body = BODY_TRAITS[traits.body];
  const label = `Banmao King: ${body.name}, ${EXPRESSION_TRAITS[traits.expression]}, ${ACCESSORY_TRAITS[traits.accessory]}, ${BACKGROUND_TRAITS[traits.background].name}, ${ACTION_NAMES[actionIndex(tokenId)]}`;
  return (
    <svg
      className="king-art"
      data-animated={animated}
      data-expression={traits.expression}
      data-accessory={traits.accessory}
      viewBox="0 0 512 512"
      role="img"
      aria-label={label}
    >
      <BackgroundLayer id={traits.background} />
      <g className="king-particles" aria-hidden="true" fill={BACKGROUND_TRAITS[traits.background].accent}>
          <circle cx="66" cy="180" r="3" />
          <circle cx="442" cy="260" r="4" />
          <circle cx="82" cy="376" r="2.5" />
          <path d="M415 160v12m-6-6h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="110" cy="100" r="3" />
      </g>
      <g className="king-ground-motion" dangerouslySetInnerHTML={{ __html: actionShadowSvg(tokenId) }} />
      {traits.background !== 0 && (
        <defs>
          <filter id="king-shadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow
              dx="0"
              dy="8"
              stdDeviation="6"
              floodColor="#12100d"
              floodOpacity="0.28"
            />
          </filter>
        </defs>
      )}
      <g filter={traits.background === 0 ? undefined : "url(#king-shadow)"}>
        <g
          transform={actionTransform(tokenId)}
          data-action={ACTION_NAMES[actionIndex(tokenId)]}
        >
          <g className="king-character-motion">
            <g dangerouslySetInnerHTML={{ __html: accessoryRearSvg(traits.accessory) }} />
            <BananaCatBody
              color={body.color}
              shade={body.shade}
              tokenId={tokenId}
            />
            <ExpressionLayer id={traits.expression} animated={animated} />
            <AccessoryLayer id={traits.accessory} />
          </g>
        </g>
      </g>
      <g dangerouslySetInnerHTML={{ __html: tokenBadgeSvg(tokenId, traits.background) }} />
    </svg>
  );
}

function TraitSelector({
  label,
  traitKey,
  names,
  selected,
  onSelect,
  colors,
}: {
  label: string;
  traitKey: TraitKey;
  names: readonly string[];
  selected: number;
  onSelect: (key: TraitKey, value: number) => void;
  colors?: readonly string[];
}) {
  return (
    <section>
      <div className="king-selector-head">
        <span>{label}</span>
        <output aria-live="polite">{names[selected]}</output>
      </div>
      <div className="king-options" role="group" aria-label={label}>
        {names.map((name, index) => (
          <button
            key={name}
            className="king-option"
            type="button"
            aria-label={`${label}: ${name}`}
            aria-pressed={selected === index}
            title={name}
            onClick={() => onSelect(traitKey, index)}
          >
            {colors ? (
              <span
                className="king-option-swatch"
                style={{ backgroundColor: colors[index] }}
              />
            ) : (
              String(index + 1).padStart(2, "0")
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function BanmaoKingClient() {
  const [language, setLanguage] = useState<Language>("vi");
  const [traits, setTraits] =
    useState<BanmaoKingTraitSelection>(INITIAL_TRAITS);
  const [previewTokenId, setPreviewTokenId] = useState(0);
  const reducedMotion = useSyncExternalStore(subscribeMotion, reducedMotionSnapshot, serverReducedMotionSnapshot);
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const animated = motionOverride ?? !reducedMotion;
  const isVi = language === "vi";
  const fingerprint = useMemo(
    () =>
      Object.values(traits)
        .map((value) => value.toString(16))
        .join("")
        .toUpperCase(),
    [traits],
  );
  const selectTrait = (key: TraitKey, value: number) =>
    setTraits((current) => ({ ...current, [key]: value }));
  const randomize = () => {
    setTraits({
      body: Math.floor(Math.random() * BODY_TRAITS.length),
      expression: Math.floor(Math.random() * EXPRESSION_TRAITS.length),
      accessory: Math.floor(Math.random() * ACCESSORY_TRAITS.length),
      background: Math.floor(Math.random() * BACKGROUND_TRAITS.length),
    });
    setPreviewTokenId((current) => current + 1);
  };

  return (
    <main className="king-page" data-motion-override={motionOverride === true}>
      <div className="king-shell">
        <header className="king-header">
          <Link
            className="king-brand"
            href="/collection"
            aria-label="Back to BANMAO collection"
          >
            <span className="king-sigil" aria-hidden="true">
              ♛
            </span>
            <span className="king-wordmark">
              BANMAO KING<small>ON-CHAIN ATELIER</small>
            </span>
          </Link>
          <div className="king-actions">
            <button
              className="king-language"
              type="button"
              onClick={() => setLanguage(isVi ? "en" : "vi")}
              aria-label={isVi ? "Switch to English" : "Chuyển sang tiếng Việt"}
            >
              {isVi ? "VI / EN" : "EN / VI"}
            </button>
            <ConnectButton
              className="king-ghost"
              accountStatus="address"
              chainStatus="none"
              showBalance={false}
              label={isVi ? "Kết nối ví" : "Connect wallet"}
            />
          </div>
        </header>
        <div className="king-main">
          <section>
            <div className="king-intro">
              <div className="king-kicker">
                {isVi
                  ? "Bản xem trước · X Layer"
                  : "Development preview · X Layer"}
              </div>
              <h1>
                Born on-chain.
                <br />
                <em>Ruled forever.</em>
              </h1>
              <p>
                {isVi
                  ? "Một vương triều Banmao được kết hợp từ các lớp SVG bất biến. Khám phá 9.216 diện mạo; trait thật được sinh từ seed khi mint."
                  : "A Banmao dynasty composed from immutable SVG layers. Explore 9,216 looks; final traits are derived from the collection seed at mint."}
              </p>
            </div>
            <div className="king-preview-card">
              <div className="king-art-frame">
                <KingArtwork traits={traits} tokenId={previewTokenId} animated={animated} />
                {/* Keep the artwork free of UI-only overlays: the NFT owns its effects. */}
              </div>
              <div className="king-preview-meta">
                <div>
                  <strong>Banmao King</strong>
                  <br />
                  <span>
                    {isVi ? "Bản phối thử" : "Composition preview"} #
                    {previewTokenId} · 0x
                    {fingerprint}
                  </span>
                </div>
                <span>SVG · 512²</span>
              </div>
            </div>
            <div className="king-stat-row">
              <div className="king-stat">
                <strong>
                  {TOTAL_COMBINATIONS.toLocaleString(isVi ? "vi-VN" : "en-US")}
                </strong>
                <span>{isVi ? "Tổ hợp" : "Combinations"}</span>
              </div>
              <div className="king-stat">
                <strong>4</strong>
                <span>{isVi ? "Lớp bất biến" : "Immutable layers"}</span>
              </div>
              <div className="king-stat">
                <strong>100%</strong>
                <span>On-chain</span>
              </div>
            </div>
          </section>
          <aside
            className="king-composer"
            aria-label={isVi ? "Xưởng phối trait" : "Trait atelier"}
          >
            <div className="king-panel-head">
              <div>
                <h2>{isVi ? "Khám phá hình mẫu" : "Explore example looks"}</h2>
                <p>
                  {isVi
                    ? "Khám phá các lớp của bộ sưu tập đã triển khai."
                    : "Explore the layers of the deployed collection."}
                </p>
              </div>
              <div className="king-panel-tools">
                <button
                  className="king-motion-toggle"
                  type="button"
                  aria-pressed={animated}
                  aria-describedby="king-motion-note"
                  onClick={() => setMotionOverride(!animated)}
                >
                  {isVi ? "Chuyển động" : "Animation"}: {animated ? (isVi ? "Bật" : "On") : (isVi ? "Tắt" : "Off")}
                </button>
                <button
                  className="king-random"
                  type="button"
                  onClick={randomize}
                >
                  ✦ {isVi ? "Ngẫu nhiên" : "Randomize"}
                </button>
                <button
                  className="king-reset"
                  type="button"
                  onClick={() => {
                    setTraits(INITIAL_TRAITS);
                    setPreviewTokenId(0);
                  }}
                  aria-label={isVi ? "Đặt lại trait" : "Reset traits"}
                >
                  ↺
                </button>
              </div>
            </div>
            <p id="king-motion-note" className="king-motion-note">
              {reducedMotion && motionOverride === null
                ? (isVi
                  ? "Đang tắt theo chế độ Giảm chuyển động của thiết bị. Bấm Chuyển động để bật xem thử; Ngẫu nhiên chỉ đổi trait và pose."
                  : "Off because your device prefers reduced motion. Press Animation to preview motion; Randomize only changes traits and pose.")
                : (isVi
                  ? "Nút Chuyển động điều khiển bản xem trước; Ngẫu nhiên chỉ đổi trait và pose. SVG on-chain vẫn tôn trọng Giảm chuyển động của trình xem."
                  : "Animation controls the preview; Randomize only changes traits and pose. On-chain SVG still respects the viewer's reduced-motion preference.")}
            </p>
            <p id="king-preview-only-note" className="king-motion-note">
              <strong>{isVi ? "CHỈ XEM TRƯỚC — KHÔNG CHỌN ĐỂ MINT" : "PREVIEW ONLY — NOT A MINT SELECTION"}</strong>
              <br />
              {isVi
                ? "Các nút chọn và Ngẫu nhiên chỉ giúp khám phá hình dáng NFT có thể có; không đặt giữ hay quyết định NFT nhận được. Contract tự cấp một tổ hợp chưa từng mint trong bộ sưu tập. Seed công khai nên kết quả có thể tính trước, không phải ngẫu nhiên chống thao túng."
                : "Selectors and Randomize only explore possible NFT appearances; they do not reserve or determine your minted NFT. The contract assigns a combination never previously minted in this collection. The public seed makes results predictable, not manipulation-resistant randomness."}
            </p>
            <div className="king-selectors" aria-describedby="king-preview-only-note">
              <TraitSelector
                label={isVi ? "Thân" : "Body"}
                traitKey="body"
                names={BODY_TRAITS.map((item) => item.name)}
                colors={BODY_TRAITS.map((item) => item.color)}
                selected={traits.body}
                onSelect={selectTrait}
              />
              <TraitSelector
                label={isVi ? "Biểu cảm" : "Expression"}
                traitKey="expression"
                names={EXPRESSION_TRAITS}
                selected={traits.expression}
                onSelect={selectTrait}
              />
              <TraitSelector
                label={isVi ? "Phụ kiện" : "Accessory"}
                traitKey="accessory"
                names={ACCESSORY_TRAITS}
                selected={traits.accessory}
                onSelect={selectTrait}
              />
              <TraitSelector
                label={isVi ? "Phông nền" : "Background"}
                traitKey="background"
                names={BACKGROUND_TRAITS.map((item) => item.name)}
                colors={BACKGROUND_TRAITS.map((item) => item.color)}
                selected={traits.background}
                onSelect={selectTrait}
              />
            </div>
            <KingMint isVi={isVi} />
          </aside>
        </div>
        <footer className="king-footer">
          <span>
            X LAYER MAINNET · CHAIN ID {BANMAO_KING_DEPLOYMENT.chainId}
          </span>
          <span>
            {isVi
              ? "Mint bằng BANMAO · X Layer"
              : "Mint with BANMAO · X Layer"}{" "}
            ·{" "}
            <Link href="/collection">
              {isVi ? "Về bộ sưu tập" : "Back to collection"}
            </Link>
          </span>
        </footer>
      </div>
    </main>
  );
}
