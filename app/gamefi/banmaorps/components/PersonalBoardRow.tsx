/**
 * PersonalBoardRow Component
 * A single row in the personal rooms table
 * Uses PersonalSummary type from lib/types.ts
 */

"use client";

import React, { useCallback } from "react";
import Image from "next/image";
import type { LocaleStrings } from "../lib/i18n";
import type { PersonalSummary, Choice } from "../lib/types";

export interface ChoiceDisplay {
    k: Choice;
    label: string;
    img: string;
}

export interface PersonalBoardRowProps {
    card: PersonalSummary;
    currentRoomId: string;
    currentChoice: Choice;
    choices: readonly ChoiceDisplay[];
    isAutoPlaying: boolean;
    isClient: boolean;
    isConnected: boolean;
    t: LocaleStrings;
    onSelectRoom: (roomId: number) => void;
    onSelectChoice: (choice: Choice) => void;
    onCopySalt: (salt: string) => Promise<void>;
    onCopyOpponent: (address: string) => Promise<void>;
    onAutoPlay: (roomId: number) => void;
    onStopAutoPlay: (roomId: number) => void;
    onPlayBeep?: () => void;
}

export default function PersonalBoardRow({
    card,
    currentRoomId,
    currentChoice,
    choices,
    isAutoPlaying,
    isClient,
    isConnected,
    t,
    onSelectRoom,
    onSelectChoice,
    onCopySalt,
    onCopyOpponent,
    onAutoPlay,
    onStopAutoPlay,
    onPlayBeep,
}: PersonalBoardRowProps) {
    const isActiveCard = currentRoomId === String(card.id);
    const isAutoPlayable =
        card.needsAction &&
        (card.actionType === "commit" || card.actionType === "reveal" || card.actionType === "claim");

    const handleCopySalt = useCallback(async () => {
        onPlayBeep?.();
        if (card.saltHex) {
            await onCopySalt(card.saltHex);
        }
    }, [card.saltHex, onCopySalt, onPlayBeep]);

    const handleCopyOpponent = useCallback(async () => {
        if (card.opponent) {
            await onCopyOpponent(card.opponent);
        }
    }, [card.opponent, onCopyOpponent]);

    const handleAutoPlayToggle = useCallback(() => {
        if (isAutoPlaying) {
            onStopAutoPlay(card.id);
        } else {
            onAutoPlay(card.id);
        }
    }, [isAutoPlaying, card.id, onAutoPlay, onStopAutoPlay]);

    const handleAction = useCallback(() => {
        card.onAction?.();
    }, [card]);

    const handleForfeit = useCallback(() => {
        onPlayBeep?.();
        card.onForfeit?.();
    }, [card, onPlayBeep]);

    return (
        <tr className={`personal-board__row personal-board__row--${card.accent}`}>
            {/* Room ID + Salt */}
            <td data-label={t.room}>
                <div className="personal-board__room">
                    <span>#{card.id}</span>
                    {card.saltHex && (
                        <button
                            type="button"
                            className="personal-board__salt"
                            onClick={handleCopySalt}
                        >
                            {t.personalCopySalt}
                        </button>
                    )}
                </div>
            </td>

            {/* Opponent */}
            <td data-label={t.opponent}>
                <div className="personal-board__opponent">
                    <span>{card.opponentDisplay}</span>
                    {card.opponent && (
                        <button
                            className="table-action-button secondary"
                            onClick={handleCopyOpponent}
                        >
                            {t.copyAddress}
                        </button>
                    )}
                </div>
            </td>

            {/* Phase */}
            <td data-label="Phase">
                <div className="personal-board__phase">
                    <span>{card.phase}</span>
                    {card.timeLeft && <span className="personal-board__time">{card.timeLeft}</span>}
                </div>
            </td>

            {/* Status */}
            <td data-label="Status">
                <div className="personal-board__status">
                    <p>{card.status}</p>
                    {card.detail && <span>{card.detail}</span>}
                </div>
            </td>

            {/* Stake + Choice */}
            <td data-label={t.stakeCol}>
                <div className="personal-board__stake">
                    <span className="personal-board__stake-value">{card.stakeText}</span>

                    {card.choice && !card.showChoicePicker && (
                        <span className="personal-board__choice-display">
                            <Image src={card.choice.img} alt={card.choice.label} width={20} height={20} />
                            <span>{card.choice.label}</span>
                        </span>
                    )}

                    {card.showChoicePicker && (
                        <div className="personal-board__choices">
                            {choices.map((c) => (
                                <button
                                    key={c.k}
                                    type="button"
                                    className={`personal-board__choice-button${isActiveCard && currentChoice === c.k ? " personal-board__choice-button--active" : ""
                                        }`}
                                    onClick={() => {
                                        onSelectRoom(card.id);
                                        onSelectChoice(c.k);
                                    }}
                                >
                                    <Image src={c.img} alt={c.label} width={20} height={20} />
                                    <span>{c.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {card.savedChoice && (
                        <span className="personal-board__saved-choice">
                            {t.personalChoiceSaved(card.savedChoice)}
                        </span>
                    )}
                </div>
            </td>

            {/* Actions */}
            <td data-label={t.actionCol} className="action-col">
                <div className="personal-board__action-stack">
                    {isAutoPlayable && (
                        <button
                            type="button"
                            className="personal-board__action"
                            onClick={handleAutoPlayToggle}
                            disabled={!isClient || (!isAutoPlaying && !isConnected)}
                        >
                            {isAutoPlaying ? t.personalAutoPlayStop : t.personalAutoPlay}
                        </button>
                    )}

                    {card.actionLabel && card.onAction ? (
                        <button className="personal-board__action" onClick={handleAction}>
                            {card.actionLabel}
                        </button>
                    ) : !card.allowForfeit ? (
                        <span className="personal-board__no-action">—</span>
                    ) : null}

                    {card.allowForfeit && (
                        <button
                            className="personal-board__action personal-board__action--danger"
                            onClick={handleForfeit}
                        >
                            {t.forfeit}
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}
