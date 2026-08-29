"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ConnectButton } from "../../components/wallet/WalletConnection";
import { BANMAO_KING_DEPLOYMENT, banmaoKingMintReady } from "./deployment";
import {
  ACCESSORY_TRAITS,
  BACKGROUND_TRAITS,
  BODY_TRAITS,
  EXPRESSION_TRAITS,
  TOTAL_COMBINATIONS,
  type BanmaoKingTraitSelection,
} from "./traits";
import "./banmaoking.css";

const INITIAL_TRAITS: BanmaoKingTraitSelection = {
  body: 0,
  expression: 0,
  accessory: 1,
  background: 3,
};
type Language = "vi" | "en";
type TraitKey = keyof BanmaoKingTraitSelection;

function BackgroundLayer({ id }: { id: number }) {
  const bg = BACKGROUND_TRAITS[id];
  if (id === 1)
    return (
      <>
        <rect width="512" height="512" fill={bg.color} />
        <path
          d="M0 80h512M0 160h512M0 240h512M0 320h512M0 400h512"
          stroke={bg.accent}
          opacity=".18"
          strokeWidth="20"
        />
      </>
    );
  if (id === 2)
    return (
      <>
        <rect width="512" height="512" fill={bg.color} />
        <circle cx="64" cy="64" r="14" fill={bg.accent} opacity=".4" />
        <circle cx="448" cy="135" r="24" fill={bg.accent} opacity=".3" />
      </>
    );
  if (id === 3)
    return (
      <>
        <rect width="512" height="512" fill={bg.color} />
        <path d="M0 512 512 0v512z" fill={bg.accent} />
        <circle cx="75" cy="84" r="8" fill="#fff2a8" />
      </>
    );
  if (id === 4)
    return (
      <>
        <rect width="512" height="512" fill={bg.color} />
        <path d="M256 0v512M0 256h512" stroke={bg.accent} opacity=".2" />
        <circle cx="84" cy="80" r="3" fill="white" />
      </>
    );
  if (id === 5)
    return (
      <>
        <rect width="512" height="512" fill={bg.color} />
        <path
          d="M0 0l512 512M512 0 0 512"
          stroke={bg.accent}
          opacity=".2"
          strokeWidth="60"
        />
      </>
    );
  if (id === 6)
    return (
      <>
        <rect width="512" height="512" fill={bg.color} />
        <circle
          cx="256"
          cy="256"
          r="220"
          fill="none"
          stroke={bg.accent}
          opacity=".24"
          strokeWidth="35"
        />
      </>
    );
  if (id === 7)
    return (
      <>
        <rect width="512" height="512" fill={bg.color} />
        <path d="M0 390q128-90 256 0t256 0v122H0z" fill={bg.accent} />
      </>
    );
  return (
    <>
      <rect width="512" height="512" fill={bg.color} />
      <circle cx="92" cy="91" r="90" fill={bg.accent} opacity=".32" />
    </>
  );
}

function ExpressionLayer({ id }: { id: number }) {
  const closed = id === 4 || id === 11;
  const eyes =
    id === 2 ? (
      <>
        <path
          d="M209 216q15-14 29 0"
          fill="none"
          stroke="#4a2a1b"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <ellipse cx="289" cy="211" rx="15" ry="18" fill="#322218" />
      </>
    ) : id === 3 ? (
      <text x="256" y="225" textAnchor="middle" fontSize="48">
        ♥ ♥
      </text>
    ) : id === 10 ? (
      <text x="256" y="224" textAnchor="middle" fontSize="46">
        ★ ★
      </text>
    ) : closed ? (
      <path
        d="M204 214q17 14 34 0M273 214q17 14 34 0"
        fill="none"
        stroke="#4a2a1b"
        strokeWidth="7"
        strokeLinecap="round"
      />
    ) : (
      <>
        <ellipse cx="222" cy="211" rx="16" ry="19" fill="#322218" />
        <ellipse cx="290" cy="211" rx="16" ry="19" fill="#322218" />
        <circle cx="216" cy="204" r="6" fill="white" />
        <circle cx="284" cy="204" r="6" fill="white" />
      </>
    );
  const mouth =
    id === 5 ? (
      <ellipse cx="256" cy="263" rx="12" ry="16" fill="#7e302d" />
    ) : closed ? (
      <path
        d="M241 258q15 8 30 0"
        fill="none"
        stroke="#713d24"
        strokeWidth="4"
      />
    ) : id === 6 ? (
      <path
        d="M237 269q19-20 38 0"
        fill="none"
        stroke="#713d24"
        strokeWidth="5"
      />
    ) : (
      <path
        d={
          id === 1
            ? "M229 250q27 36 55 0-4 37-28 38-23-2-27-38z"
            : "M233 251q23 22 47 0-4 27-24 28-20-1-23-28z"
        }
        fill={id === 1 ? "#7e302d" : "white"}
        stroke="#713d24"
        strokeWidth="3"
      />
    );
  return (
    <g>
      {eyes}
      <path d="M256 226l-10 9 11 8 11-8z" fill="#d95c56" />
      {mouth}
      {id === 7 && (
        <path
          d="M208 225q-6 13 4 17 10-5 3-18M297 225q6 13-4 17-10-5-3-18"
          fill="#71d9ff"
        />
      )}
    </g>
  );
}

function AccessoryLayer({ id }: { id: number }) {
  if (id === 0) return null;
  if (id === 1)
    return (
      <path
        d="M190 116l12-39 29 25 25-37 25 37 30-25 11 42z"
        fill="#ffd84e"
        stroke="#7d4d16"
        strokeWidth="6"
      />
    );
  if (id === 3)
    return (
      <g fill="none" stroke="#5b3825" strokeWidth="6">
        <circle cx="220" cy="212" r="25" />
        <circle cx="292" cy="212" r="25" />
        <path d="M245 210h22" />
      </g>
    );
  if (id === 4)
    return (
      <path
        d="M194 197h53v27h-13v13h-21v-13h-19zM265 197h53v27h-19v13h-21v-13h-13z"
        fill="#1c2033"
        stroke="#070912"
        strokeWidth="5"
      />
    );
  if (id === 5)
    return (
      <>
        <path
          d="M205 151l48-105 54 107z"
          fill="#ff6d8d"
          stroke="#713d24"
          strokeWidth="6"
        />
        <circle cx="253" cy="43" r="13" fill="#57d6d0" />
      </>
    );
  if (id === 6)
    return (
      <>
        <path
          d="M196 302q60 66 120-1"
          fill="none"
          stroke="#f6c944"
          strokeWidth="12"
          strokeDasharray="12 5"
        />
        <circle cx="256" cy="345" r="18" fill="#f6c944" />
      </>
    );
  if (id === 8)
    return (
      <>
        <path
          d="M187 218q-3-69 69-72 72 3 69 72"
          fill="none"
          stroke="#33384f"
          strokeWidth="13"
        />
        <rect x="174" y="207" width="29" height="58" rx="12" fill="#56c9ff" />
        <rect x="309" y="207" width="29" height="58" rx="12" fill="#56c9ff" />
      </>
    );
  if (id === 9)
    return (
      <path
        d="M182 150q73-23 148 0l-42-47 7-60-48 42-45-25 18 58z"
        fill="#694aa8"
        stroke="#35255d"
        strokeWidth="7"
      />
    );
  if (id === 10)
    return (
      <ellipse
        cx="256"
        cy="91"
        rx="75"
        ry="18"
        fill="none"
        stroke="#ffe56d"
        strokeWidth="10"
      />
    );
  if (id === 11)
    return (
      <path
        d="M174 283q-31 75-4 126l45-62zM338 283q31 75 4 126l-45-62z"
        fill="#d84960"
        stroke="#702535"
        strokeWidth="6"
      />
    );
  return (
    <path
      d={
        id === 2
          ? "M185 292q-38-24-40 12 4 35 44 8l17 11 15-29-19 4zM327 292q38-24 40 12-4 35-44 8l-17 11-15-29 19 4z"
          : "M327 338q43-32 57 11-35 26-57-11z"
      }
      fill={id === 2 ? "#ed4d4d" : "#5bcf69"}
      stroke="#713d24"
      strokeWidth="5"
    />
  );
}

function KingArtwork({ traits }: { traits: BanmaoKingTraitSelection }) {
  const body = BODY_TRAITS[traits.body];
  const label = `Banmao King: ${body.name}, ${EXPRESSION_TRAITS[traits.expression]}, ${ACCESSORY_TRAITS[traits.accessory]}, ${BACKGROUND_TRAITS[traits.background].name}`;
  return (
    <svg
      className="king-art"
      viewBox="0 0 512 512"
      role="img"
      aria-label={label}
    >
      <defs>
        <filter id="king-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="7" stdDeviation="6" floodOpacity=".2" />
        </filter>
      </defs>
      <BackgroundLayer id={traits.background} />
      <g filter="url(#king-shadow)">
        <ellipse
          cx="256"
          cy="467"
          rx="126"
          ry="20"
          fill="#15111f"
          opacity=".18"
        />
        <path
          d="M351 314c54 5 84 43 59 71-18 20-52 7-45-15 4-13 20-13 24-4-2-17-18-25-40-24"
          fill="none"
          stroke="#c9782f"
          strokeWidth="19"
          strokeLinecap="round"
        />
        <path
          d="M182 389c-5 36-4 62 2 72 8 12 42 12 48-1 5-11 2-42-3-68M284 393c-3 35-1 62 6 69 9 10 42 8 47-5 4-11-4-43-10-68"
          fill="#d98b3c"
          stroke="#713d24"
          strokeWidth="5"
        />
        <path
          d="M171 264c-33 25-55 74-43 90 14 19 39-12 55-50M339 262c35 15 60 54 52 73-10 23-40-4-57-36"
          fill="#d98b3c"
          stroke="#713d24"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M256 51c80 18 127 107 114 218-9 79-45 162-105 179-62 17-111-16-120-96-10-89 20-138 40-187 14-35 37-57 51-72l-7-38z"
          fill={body.color}
          stroke="#5b4620"
          strokeWidth="7"
        />
        <path
          d="M256 51c49 17 86 91 81 192-4 85-25 157-72 205 60-17 96-100 105-179 13-111-34-200-114-218z"
          fill={body.shade}
          opacity=".42"
        />
        <path
          d="M229 55l-6-28q21-14 43-6l7 30z"
          fill="#75421f"
          stroke="#4b2b19"
          strokeWidth="6"
        />
        <path
          d="M196 165c-33 26-33 101 12 128 33 20 99 16 126-18 27-35 11-96-30-114-31-14-82-14-108 4z"
          fill="#df9046"
          stroke="#713d24"
          strokeWidth="7"
        />
        <ExpressionLayer id={traits.expression} />
        <AccessoryLayer id={traits.accessory} />
      </g>
      <text
        x="486"
        y="490"
        textAnchor="end"
        fill="white"
        opacity=".55"
        fontFamily="sans-serif"
        fontSize="13"
      >
        BANMAO KING
      </text>
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
  const randomize = () =>
    setTraits({
      body: Math.floor(Math.random() * BODY_TRAITS.length),
      expression: Math.floor(Math.random() * EXPRESSION_TRAITS.length),
      accessory: Math.floor(Math.random() * ACCESSORY_TRAITS.length),
      background: Math.floor(Math.random() * BACKGROUND_TRAITS.length),
    });

  return (
    <main className="king-page">
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
                <KingArtwork traits={traits} />
                <span className="king-art-glint" aria-hidden="true" />
              </div>
              <div className="king-preview-meta">
                <div>
                  <strong>Banmao King</strong>
                  <br />
                  <span>
                    {isVi ? "Bản phối thử" : "Composition preview"} · 0x
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
                <h2>{isVi ? "Xưởng Hoàng Gia" : "Royal Atelier"}</h2>
                <p>
                  {isVi
                    ? "Phối thử các lớp trước khi bộ sưu tập triển khai."
                    : "Preview the layers before collection deployment."}
                </p>
              </div>
              <div className="king-panel-tools">
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
                  onClick={() => setTraits(INITIAL_TRAITS)}
                  aria-label={isVi ? "Đặt lại trait" : "Reset traits"}
                >
                  ↺
                </button>
              </div>
            </div>
            <div className="king-selectors">
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
            <div className="king-mint-box">
              <div className="king-mint-title">
                <span>{isVi ? "Trạng thái đúc" : "Mint status"}</span>
                <span className="king-preview-badge">
                  {BANMAO_KING_DEPLOYMENT.status}
                </span>
              </div>
              <p>
                {isVi
                  ? "Chưa có manifest triển khai được phê duyệt. Kết nối ví chỉ để xem trạng thái; không có giao dịch nào được tạo."
                  : "No approved deployment manifest exists. Wallet connection is display-only; no transaction can be created."}
              </p>
              <div className="king-wallet-row">
                <ConnectButton
                  accountStatus="address"
                  chainStatus="none"
                  showBalance={false}
                  label={isVi ? "Kết nối ví" : "Connect wallet"}
                />
                <button
                  className="king-mint-disabled"
                  type="button"
                  disabled={!banmaoKingMintReady()}
                >
                  {isVi ? "Mint chưa mở" : "Mint unavailable"}
                </button>
              </div>
            </div>
          </aside>
        </div>
        <footer className="king-footer">
          <span>
            NON-PRODUCTION PREVIEW · CHAIN ID {BANMAO_KING_DEPLOYMENT.chainId}
          </span>
          <span>
            {isVi
              ? "Không địa chỉ contract · Không giao dịch"
              : "No contract address · No transactions"}{" "}
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
