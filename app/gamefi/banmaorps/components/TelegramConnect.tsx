"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";

import type { LocaleStrings } from "../lib/i18n";
import {
  TELEGRAM_STATUS_ENDPOINT,
  TELEGRAM_TOKEN_ENDPOINT,
  buildTelegramBotUrl,
} from "../lib/telegram";
import { IconTelegram } from "./Icons";

type TelegramConnectionStatus =
  | "loading"
  | "not_connected"
  | "connecting"
  | "connected"
  | "error";

interface TelegramConnectProps {
  strings: LocaleStrings;
  defaultConnected?: boolean;
  onBeforeConnect?: () => void;
  onConnected?: () => void;
}

interface GenerateTokenResponse {
  token?: string;
}

interface CheckStatusResponse {
  isConnected?: boolean;
}

const STATUS_ICONS: Record<TelegramConnectionStatus, string> = {
  loading: "🔄",
  not_connected: "🚀",
  connecting: "⏳",
  connected: "✅",
  error: "⚠️",
};

export default function TelegramConnect({
  strings,
  defaultConnected = false,
  onBeforeConnect,
  onConnected,
}: TelegramConnectProps) {
  const { address, isConnected } = useAccount();
  const [status, setStatus] = useState<TelegramConnectionStatus>(() =>
    defaultConnected ? "connected" : "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const pollTimeoutRef = useRef<number | null>(null);
  const hasNotifiedConnectedRef = useRef(false);

  const walletMissing = !isConnected || !address;

  const clearPolling = useCallback(() => {
    if (typeof window === "undefined") return;
    if (pollTimeoutRef.current != null) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const checkStatus = useCallback(
    async ({ silent, signal }: { silent?: boolean; signal?: AbortSignal } = {}) => {
      if (!isConnected || !address) {
        return false;
      }

      if (!silent) {
        setStatus((prev) => (prev === "connecting" ? prev : "loading"));
        setError(null);
      }

      try {
        const response = await fetch(
          `${TELEGRAM_STATUS_ENDPOINT}?walletAddress=${encodeURIComponent(address)}`,
          {
            method: "GET",
            signal,
          }
        );

        if (!response.ok) {
          throw new Error("SERVER_ERROR");
        }

        const data = (await response.json()) as CheckStatusResponse;

        if (data?.isConnected) {
          setStatus("connected");
          setError(null);
          return true;
        }

        setStatus((prev) => (prev === "connecting" ? prev : "not_connected"));
        return false;
      } catch (err) {
        if (signal?.aborted) {
          return false;
        }

        console.error("Failed to check Telegram status", err);

        if (err instanceof Error && err.message === "SERVER_ERROR") {
          setError(strings.telegramReminderServerError);
        } else {
          setError(strings.telegramReminderUnknownError);
        }

        setStatus("error");
        return false;
      }
    },
    [address, isConnected, strings.telegramReminderServerError, strings.telegramReminderUnknownError]
  );

  const beginPollingStatus = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!isConnected || !address) return;

    clearPolling();

    const poll = async () => {
      const isLinked = await checkStatus({ silent: true });
      if (isLinked) {
        clearPolling();
        return;
      }

      pollTimeoutRef.current = window.setTimeout(poll, 5000);
    };

    pollTimeoutRef.current = window.setTimeout(poll, 4000);
  }, [address, checkStatus, clearPolling, isConnected]);

  useEffect(() => clearPolling, [clearPolling]);

  useEffect(() => {
    if (status === "connected" || status === "error" || status === "not_connected") {
      clearPolling();
    }
  }, [status, clearPolling]);

  useEffect(() => {
    if (!isConnected || !address) {
      setError(null);
      setStatus(defaultConnected ? "connected" : "not_connected");
      return;
    }

    const controller = new AbortController();
    void checkStatus({ signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [address, isConnected, defaultConnected, checkStatus]);

  useEffect(() => {
    if (status === "connected" && !walletMissing) {
      if (!hasNotifiedConnectedRef.current) {
        hasNotifiedConnectedRef.current = true;
        onConnected?.();
      }
    } else if (status !== "loading") {
      hasNotifiedConnectedRef.current = false;
    }
  }, [status, walletMissing, onConnected]);

  const handleConnect = useCallback(async () => {
    onBeforeConnect?.();

    if (!isConnected || !address) {
      setError(strings.telegramReminderWalletRequired);
      setStatus((prev) => (prev === "connected" ? prev : "not_connected"));
      return;
    }

    setIsRequesting(true);
    setError(null);
    setStatus((prev) => (prev === "connecting" ? prev : "loading"));

    try {
      const response = await fetch(TELEGRAM_TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (!response.ok) {
        throw new Error("SERVER_ERROR");
      }

      const data = (await response.json()) as GenerateTokenResponse;
      if (!data?.token) {
        throw new Error("TOKEN_MISSING");
      }

      const telegramUrl = buildTelegramBotUrl(data.token);
      let didOpen = false;

      if (typeof window !== "undefined") {
        const newWindow = window.open(telegramUrl, "_blank", "noopener,noreferrer");

        if (newWindow) {
          newWindow.focus?.();
          didOpen = true;
        } else {
          setError(strings.telegramReminderPopupBlocked);
        }
      }

      if (!didOpen) {
        setStatus((prev) => (prev === "connecting" ? prev : "not_connected"));
        return;
      }

      setStatus("connecting");
      beginPollingStatus();
    } catch (err) {
      console.error("Failed to launch Telegram bot", err);

      if (err instanceof Error) {
        if (err.message === "SERVER_ERROR" || err.message === "TOKEN_MISSING") {
          setError(strings.telegramReminderServerError);
        } else {
          setError(strings.telegramReminderUnknownError);
        }
      } else {
        setError(strings.telegramReminderUnknownError);
      }

      setStatus((prev) => (prev === "connecting" ? prev : "error"));
    } finally {
      setIsRequesting(false);
    }
  }, [
    address,
    beginPollingStatus,
    isConnected,
    onBeforeConnect,
    strings.telegramReminderPopupBlocked,
    strings.telegramReminderServerError,
    strings.telegramReminderUnknownError,
    strings.telegramReminderWalletRequired,
  ]);

  const statusMessage = useMemo(() => {
    switch (status) {
      case "loading":
        return strings.telegramReminderLoading;
      case "not_connected":
        return strings.telegramReminderDetail;
      case "connecting":
        return strings.telegramReminderConnecting;
      case "connected":
        return strings.telegramReminderSuccess;
      case "error":
        return error ?? strings.telegramReminderUnknownError;
      default:
        return strings.telegramReminderDetail;
    }
  }, [status, strings, error]);

  const statusIcon = STATUS_ICONS[status];
  const showActionButton = status !== "connected";

  const actionLabel = useMemo(() => {
    if (status === "loading") {
      return strings.telegramReminderLoading;
    }
    if (status === "connecting") {
      return strings.telegramReminderLink;
    }
    return strings.telegramReminderConnectButton ?? strings.telegramReminderLink;
  }, [status, strings.telegramReminderConnectButton, strings.telegramReminderLink, strings.telegramReminderLoading]);

  const actionDisabled =
    walletMissing ||
    isRequesting ||
    status === "loading" ||
    status === "connecting";

  const statusClassName = `telegram-connect-box__status telegram-connect-box__status--${status}`;

  return (
    <div className="telegram-connect-box">
      

      <div className={statusClassName} aria-live="polite">
        <span className="telegram-connect-box__status-icon" aria-hidden="true">
          {statusIcon}
        </span>
        <p className="telegram-connect-box__status-text">{statusMessage}</p>
      </div>

      {showActionButton ? (
        <div className="telegram-connect-box__actions">
          <button
            type="button"
            className="telegram-connect-box__button"
            onClick={handleConnect}
            disabled={actionDisabled}
            aria-busy={isRequesting || status === "loading"}
            title={walletMissing ? strings.telegramReminderWalletRequired : undefined}
          >
            {actionLabel}
          </button>
        </div>
      ) : null}

      {error && status !== "error" ? (
        <p className="telegram-connect-box__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
