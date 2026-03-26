/**
 * TelegramRemindersPanel Component
 * Collapsible panel for Telegram notifications setup
 */

"use client";

import React from "react";
import { FaChevronDown } from "react-icons/fa";
import { IconTelegram } from "./Icons";
import TelegramConnect from "./TelegramConnect";
import type { LocaleStrings } from "../lib/i18n";

export interface TelegramRemindersPanelProps {
    isCollapsed: boolean;
    isTelegramConnected: boolean;
    t: LocaleStrings;
    onToggle: () => void;
    onConnected: () => void;
    onBeforeConnect: () => void;
}

export default function TelegramRemindersPanel({
    isCollapsed,
    isTelegramConnected,
    t,
    onToggle,
    onConnected,
    onBeforeConnect,
}: TelegramRemindersPanelProps) {
    return (
        <section
            className={`telegram-reminders${isCollapsed ? " telegram-reminders--collapsed" : ""}`}
        >
            <button
                type="button"
                className="telegram-reminders__toggle"
                onClick={onToggle}
                aria-expanded={!isCollapsed}
                aria-controls="telegram-reminders-content"
                title={t.telegramReminderLabel}
            >
                <IconTelegram width={18} height={18} />
                <span>{t.telegramReminderLabel}</span>
                <FaChevronDown
                    className={`telegram-reminders__chevron${isCollapsed ? "" : " telegram-reminders__chevron--open"}`}
                    aria-hidden="true"
                />
            </button>
            <div
                className="telegram-reminders__content"
                id="telegram-reminders-content"
                hidden={isCollapsed}
                aria-hidden={isCollapsed}
            >
                <TelegramConnect
                    strings={t}
                    defaultConnected={isTelegramConnected}
                    onConnected={onConnected}
                    onBeforeConnect={onBeforeConnect}
                />
            </div>
        </section>
    );
}
