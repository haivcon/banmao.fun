"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserLanguage, type Language } from "../web3d/locals";
import "./defi.css";

const ERROR_COPY: Record<Language, { title: string; description: string; retry: string; back: string }> = {
  en: { title: "Unable to load DeFi", description: "The route or its on-chain data could not be loaded. Your wallet and funds are not affected.", retry: "Try again", back: "Back to overview" },
  vi: { title: "Không thể tải DeFi", description: "Không thể tải trang hoặc dữ liệu on-chain. Ví và tài sản của bạn không bị ảnh hưởng.", retry: "Thử lại", back: "Về trang tổng quan" },
  zh: { title: "无法加载 DeFi", description: "无法加载页面或链上数据。你的钱包和资金不受影响。", retry: "重试", back: "返回总览" },
  ko: { title: "DeFi를 불러올 수 없습니다", description: "페이지 또는 온체인 데이터를 불러오지 못했습니다. 지갑과 자금에는 영향이 없습니다.", retry: "다시 시도", back: "개요로 돌아가기" },
  ru: { title: "Не удалось загрузить DeFi", description: "Не удалось загрузить страницу или данные блокчейна. Кошелёк и средства не затронуты.", retry: "Повторить", back: "К обзору" },
  id: { title: "DeFi tidak dapat dimuat", description: "Halaman atau data on-chain tidak dapat dimuat. Dompet dan dana Anda tidak terpengaruh.", retry: "Coba lagi", back: "Kembali ke ringkasan" },
};

export default function DeFiError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    console.error("DeFi route error:", error);
    const saved = window.localStorage.getItem("banmao_language") as Language | null;
    setLanguage(saved && Object.prototype.hasOwnProperty.call(ERROR_COPY, saved) ? saved : getBrowserLanguage());
    const syncLanguage = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next && Object.prototype.hasOwnProperty.call(ERROR_COPY, next)) setLanguage(next);
    };
    window.addEventListener("banmao:language-change", syncLanguage);
    return () => window.removeEventListener("banmao:language-change", syncLanguage);
  }, [error]);
  const copy = ERROR_COPY[language];

  return (
    <div className="defi-overview-state" role="alert">
      <div className="defi-overview-state__card">
        <div className="defi-overview-state__icon" aria-hidden="true">
          ⚠️
        </div>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        {process.env.NODE_ENV === "development" && (
          <pre
            style={{
              margin: "0 0 20px",
              padding: "12px",
              overflowWrap: "anywhere",
              whiteSpace: "pre-wrap",
              border: "1px solid rgba(251, 113, 133, 0.28)",
              borderRadius: "10px",
              background: "rgba(127, 29, 29, 0.14)",
              color: "#fecdd3",
              fontSize: "12px",
              lineHeight: 1.5,
              textAlign: "left",
            }}
          >
            {error.name}: {error.message}
            {error.digest ? `\nDigest: ${error.digest}` : ""}
          </pre>
        )}
        <div className="defi-overview__hero-actions">
          <button
            type="button"
            className="defi-button defi-button--primary"
            onClick={reset}
          >
            {copy.retry}
          </button>
          <Link href="/defi" className="defi-button defi-button--secondary">
            {copy.back}
          </Link>
        </div>
      </div>
    </div>
  );
}