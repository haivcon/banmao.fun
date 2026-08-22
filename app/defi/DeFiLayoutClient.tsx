"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Flame,
  Gift,
  Home,
  LockKeyhole,
  PackageOpen,
  Rocket,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";
import { ConnectButton } from "../components/wallet/WalletConnection";
import {
  BANMAOBOX_TESTNET_UI_ENABLED,
  XLAYER_CHAIN_ID,
  XLAYER_SUPPORTED_CHAIN_IDS,
  XLAYER_TESTNET_CHAIN_ID,
} from "../lib/walletConfig";
import {
  getBrowserLanguage,
  type Language,
} from "../web3d/locals";
import { LanguageSelector } from "./LanguageSelector";
import DeFiAIContext from "./DeFiAIContext";
import type { DeFiApp } from "../../lib/ai/contracts";
import "./defi-shell.css";

const NAV_ITEMS = [
  { href: "/defi", key: "overview", icon: Home },
  { href: "/defi/staking", key: "staking", icon: LockKeyhole },
  { href: "/defi/burn", key: "burn", icon: Flame },
  { href: "/defi/airdrop", key: "airdrop", icon: Gift },
  { href: "/defi/box", key: "box", icon: PackageOpen },
  ...(process.env.NODE_ENV === "development"
    ? [
        {
          href: "/defi/launchpad",
          key: "launchpad",
          icon: Rocket,
        } as const,
      ]
    : []),
] as const;

const DEVELOPMENT_LABEL: Record<Language, string> = {
  en: "In development",
  vi: "Đang triển khai",
  zh: "开发中",
  ko: "개발 중",
  ru: "В разработке",
  id: "Dalam pengembangan",
};

const SHELL_COPY: Record<
  Language,
  {
    skip: string;
    ecosystem: string;
    overview: string;
    staking: string;
    burn: string;
    airdrop: string;
    box: string;
    launchpad: string;
    networkReady: string;
    networkWrong: string;
    networkDisconnected: string;
    networkSwitching: string;
    navigationLabel: string;
  }
> = {
  en: {
    skip: "Skip to content",
    ecosystem: "X Layer ecosystem",
    overview: "Overview",
    staking: "Staking",
    burn: "Burn",
    airdrop: "Airdrop",
    box: "Box",
    launchpad: "Launchpad",
    networkReady: "X Layer",
    networkWrong: "Switch to X Layer",
    networkDisconnected: "X Layer",
    networkSwitching: "Switching…",
    navigationLabel: "DeFi applications",
  },
  vi: {
    skip: "Bỏ qua đến nội dung",
    ecosystem: "Hệ sinh thái X Layer",
    overview: "Tổng quan",
    staking: "Staking",
    burn: "Đốt",
    airdrop: "Airdrop",
    box: "Box",
    launchpad: "Launchpad",
    networkReady: "X Layer",
    networkWrong: "Chuyển sang X Layer",
    networkDisconnected: "X Layer",
    networkSwitching: "Đang chuyển…",
    navigationLabel: "Ứng dụng DeFi",
  },
  zh: {
    skip: "跳至内容",
    ecosystem: "X Layer 生态系统",
    overview: "概览",
    staking: "质押",
    burn: "销毁",
    airdrop: "空投",
    box: "Box",
    launchpad: "发射台",
    networkReady: "X Layer",
    networkWrong: "切换到 X Layer",
    networkDisconnected: "X Layer",
    networkSwitching: "切换中…",
    navigationLabel: "DeFi 应用",
  },
  ko: {
    skip: "콘텐츠로 건너뛰기",
    ecosystem: "X Layer 생태계",
    overview: "개요",
    staking: "스테이킹",
    burn: "소각",
    airdrop: "에어드롭",
    box: "Box",
    launchpad: "런치패드",
    networkReady: "X Layer",
    networkWrong: "X Layer로 전환",
    networkDisconnected: "X Layer",
    networkSwitching: "전환 중…",
    navigationLabel: "DeFi 애플리케이션",
  },
  ru: {
    skip: "Перейти к содержанию",
    ecosystem: "Экосистема X Layer",
    overview: "Обзор",
    staking: "Стейкинг",
    burn: "Сжигание",
    airdrop: "Аирдроп",
    box: "Box",
    launchpad: "Лаунчпад",
    networkReady: "X Layer",
    networkWrong: "Переключить на X Layer",
    networkDisconnected: "X Layer",
    networkSwitching: "Переключение…",
    navigationLabel: "Приложения DeFi",
  },
  id: {
    skip: "Lewati ke konten",
    ecosystem: "Ekosistem X Layer",
    overview: "Ringkasan",
    staking: "Staking",
    burn: "Bakar",
    airdrop: "Airdrop",
    box: "Box",
    launchpad: "Launchpad",
    networkReady: "X Layer",
    networkWrong: "Beralih ke X Layer",
    networkDisconnected: "X Layer",
    networkSwitching: "Mengalihkan…",
    navigationLabel: "Aplikasi DeFi",
  },
};

function isCurrentRoute(pathname: string, href: string) {
  if (href === "/defi") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function aiAppForPath(pathname: string): DeFiApp {
  if (pathname.startsWith("/defi/staking")) return "staking";
  if (pathname.startsWith("/defi/burn")) return "burn";
  if (pathname.startsWith("/defi/airdrop")) return "airdrop";
  if (pathname.startsWith("/defi/box")) return "box";
  return "overview";
}

function isAdminRoute(pathname: string) {
  return (
    pathname === "/defi/admin" ||
    pathname.startsWith("/defi/admin/") ||
    pathname === "/defi/launchpad/admin" ||
    pathname.startsWith("/defi/launchpad/admin/") ||
    pathname === "/defi/box/admin" ||
    pathname.startsWith("/defi/box/admin/")
  );
}

function NetworkStatus({
  copy,
}: {
  copy: (typeof SHELL_COPY)[Language];
}) {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const boxRoute = usePathname().startsWith("/defi/box");
  const supportedChain =
    chainId === XLAYER_CHAIN_ID ||
    (BANMAOBOX_TESTNET_UI_ENABLED &&
      boxRoute &&
      chainId === XLAYER_TESTNET_CHAIN_ID);
  const wrongNetwork = isConnected && !supportedChain;

  if (wrongNetwork) {
    return (
      <button
        type="button"
        className="defi-network-status defi-network-status--wrong"
        onClick={() => switchChain({ chainId: XLAYER_CHAIN_ID })}
        disabled={isPending}
        aria-label={copy.networkWrong}
        title={copy.networkWrong}
      >
        <span className="defi-network-status__dot" aria-hidden="true" />
        <span className="defi-network-status__label">
          {isPending ? copy.networkSwitching : copy.networkWrong}
        </span>
      </button>
    );
  }

  return (
    <div
      className={`defi-network-status ${
        isConnected ? "defi-network-status--ready" : ""
      }`}
      title={
        isConnected ? copy.networkReady : copy.networkDisconnected
      }
      aria-label={
        isConnected ? copy.networkReady : copy.networkDisconnected
      }
    >
      <span className="defi-network-status__dot" aria-hidden="true" />
      <span className="defi-network-status__label">
        {isConnected ? copy.networkReady : copy.networkDisconnected}
      </span>
    </div>
  );
}

function PublicDeFiShell({
  children,
  pathname,
}: {
  children: ReactNode;
  pathname: string;
}) {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(
      "banmao_language",
    ) as Language | null;
    setLang(
      saved && Object.prototype.hasOwnProperty.call(SHELL_COPY, saved)
        ? saved
        : getBrowserLanguage(),
    );

    const syncLanguage = (event: Event) => {
      const nextLanguage = (event as CustomEvent<Language>).detail;
      if (
        nextLanguage &&
        Object.prototype.hasOwnProperty.call(SHELL_COPY, nextLanguage)
      ) {
        setLang(nextLanguage);
      }
    };

    window.addEventListener("banmao:language-change", syncLanguage);
    return () =>
      window.removeEventListener("banmao:language-change", syncLanguage);
  }, []);

  const copy = SHELL_COPY[lang];
  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        ...item,
        label: copy[item.key],
        current: isCurrentRoute(pathname, item.href),
      })),
    [copy, pathname],
  );

  const handleLanguageChange = (nextLanguage: Language) => {
    setLang(nextLanguage);
    window.localStorage.setItem("banmao_language", nextLanguage);
    window.dispatchEvent(
      new CustomEvent<Language>("banmao:language-change", {
        detail: nextLanguage,
      }),
    );
  };

  return (
    <div className="defi-app-shell">
      <a href="#defi-main-content" className="defi-shell-skip-link">
        {copy.skip}
      </a>

      <header className="defi-app-shell__header">
        <div className="defi-app-shell__header-inner">
          <Link href="/defi" className="defi-app-shell__brand">
            <span className="defi-app-shell__brand-mark" aria-hidden="true">
              <Image
                src="/branding/banmao_logo.png"
                alt=""
                width={38}
                height={38}
                priority
              />
            </span>
            <span className="defi-app-shell__brand-copy">
              <strong>BANMAO DeFi</strong>
              <small>{copy.ecosystem}</small>
            </span>
          </Link>

          <nav
            className="defi-app-shell__nav"
            aria-label={copy.navigationLabel}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="defi-app-shell__nav-link"
                aria-current={item.current ? "page" : undefined}
              >
                <span>{item.label}</span>
                {item.key === "launchpad" && (
                  <span className="defi-app-shell__nav-status">
                    {DEVELOPMENT_LABEL[lang]}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="defi-app-shell__actions">
            <NetworkStatus copy={copy} />
            <LanguageSelector
              currentLang={lang}
              onChangeLang={handleLanguageChange}
            />
            <span
              className="defi-app-shell__wallet-target"
              data-tour="defi-wallet-connect"
            >
              <ConnectButton
                showBalance={false}
                chainStatus="icon"
                accountStatus="avatar"
                supportedChainIds={
                  BANMAOBOX_TESTNET_UI_ENABLED && pathname.startsWith("/defi/box")
                    ? [...XLAYER_SUPPORTED_CHAIN_IDS]
                    : [XLAYER_CHAIN_ID]
                }
              />
            </span>
          </div>
        </div>
      </header>

      <main id="defi-main-content" className="defi-app-shell__content">
        {pathname.startsWith("/defi/burn") || pathname.startsWith("/defi/airdrop") ? (
          <>
            {children}
            <DeFiAIContext app={aiAppForPath(pathname)} lang={lang} />
          </>
        ) : (
          <>
            <DeFiAIContext app={aiAppForPath(pathname)} lang={lang} />
            {children}
          </>
        )}
      </main>

      <nav
        className="defi-app-shell__bottom-nav"
        aria-label={copy.navigationLabel}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="defi-app-shell__bottom-link"
              aria-current={item.current ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
              {item.key === "launchpad" && (
                <small className="defi-app-shell__bottom-status">DEV</small>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function DeFiLayoutClient({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      {isAdminRoute(pathname) ? (
        children
      ) : (
        <PublicDeFiShell pathname={pathname}>
          {children}
        </PublicDeFiShell>
      )}
      <Toaster
        position="top-center"
        reverseOrder={false}
        containerClassName="banmao-toast-region"
        containerStyle={{
          top: "max(12px, env(safe-area-inset-top))",
          left: "max(12px, env(safe-area-inset-left))",
          right: "max(12px, env(safe-area-inset-right))",
          zIndex: 2147483647,
        }}
        toastOptions={{
          duration: 4800,
          ariaProps: { role: "status", "aria-live": "polite" },
          style: {
            width: "min(520px, calc(100vw - 24px))",
            maxWidth: "100%",
            border: "1px solid rgba(255, 216, 90, 0.28)",
            borderRadius: "14px",
            background: "rgba(15, 18, 27, 0.98)",
            color: "#f8fafc",
            boxShadow: "0 20px 55px rgba(0, 0, 0, 0.48)",
            padding: "13px 16px",
          },
        }}
      />
    </>
  );
}