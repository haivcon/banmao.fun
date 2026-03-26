/**
 * RoomsTableSection Component
 * Displays the list of game rooms with table view
 */

"use client";

import React from "react";
import { FaSyncAlt } from "react-icons/fa";
import RoomTableRow from "./RoomTableRow";
import type { LocaleStrings } from "../lib/i18n";

export interface RoomMeta {
    view: any;
    [key: string]: any;
}

export interface RoomsTableSectionProps {
    visibleRooms: any[];
    roomMeta: Map<any, any>;
    viewerAddress: string;
    nowTs: number;
    decimals: number;
    isRefreshing: boolean;
    refreshLabel: string;
    isConnected: boolean;
    isClient: boolean;
    t: LocaleStrings;
    enhanceRoomDeadlines: (room: any) => any;
    onRefresh: () => void;
    onJoin: (roomId: any) => void;
    onCommit: (roomId: any) => void;
    onReveal: (roomId: any) => void;
    onClaim: (roomId: any) => void;
    onForfeit: (roomId: any) => void;
    onCopyAddress: (addr: string) => Promise<void>;
    onSetRoomId: (roomId: string) => void;
}

export default function RoomsTableSection({
    visibleRooms,
    roomMeta,
    viewerAddress,
    nowTs,
    decimals,
    isRefreshing,
    refreshLabel,
    isConnected,
    isClient,
    t,
    enhanceRoomDeadlines,
    onRefresh,
    onJoin,
    onCommit,
    onReveal,
    onClaim,
    onForfeit,
    onCopyAddress,
    onSetRoomId,
}: RoomsTableSectionProps) {
    return (
        <section style={{ marginTop: 24 }}>
            <div className="section-heading">
                <h3 className="glowing-title">{t.list}</h3>
                <button
                    type="button"
                    className={`icon-refresh-button section-heading__refresh${isRefreshing ? " icon-refresh-button--spinning" : ""}`}
                    onClick={onRefresh}
                    title={refreshLabel}
                    aria-label={refreshLabel}
                    disabled={isRefreshing}
                >
                    <FaSyncAlt className="icon-refresh-button__icon" aria-hidden="true" />
                </button>
            </div>
            {visibleRooms.length === 0 ? (
                <p>{t.empty}</p>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>{t.creator}</th>
                                <th>{t.opponent}</th>
                                <th>{t.stakeCol}</th>
                                <th className="time-col">Time</th>
                                <th className="state-col">{t.stateCol}</th>
                                <th className="action-col">{t.actionCol}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRooms.map((r) => {
                                const meta = roomMeta.get(r.id);
                                const viewRoom = meta?.view ?? enhanceRoomDeadlines(r);
                                return (
                                    <RoomTableRow
                                        key={r.id}
                                        room={viewRoom}
                                        meta={meta}
                                        viewerAddress={viewerAddress}
                                        nowTs={nowTs}
                                        decimals={decimals}
                                        t={t}
                                        isConnected={isConnected}
                                        isClient={isClient}
                                        onJoin={(roomId) => onJoin(roomId)}
                                        onCommit={(roomId) => onCommit(roomId)}
                                        onReveal={(roomId) => onReveal(roomId)}
                                        onClaim={(roomId) => onClaim(roomId)}
                                        onForfeit={(roomId) => onForfeit(roomId)}
                                        onCopyAddress={onCopyAddress}
                                        onSetRoomId={onSetRoomId}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
