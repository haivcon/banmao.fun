"use client";
import React, { memo } from "react";
import { shortAddr } from "../lib/helpers";

interface LikeListModalProps {
    t: Record<string, string>;
    likeListData: any[];
    onClose: () => void;
    onProfileClick: (address: string) => void;
}

const LikeListModal = memo(function LikeListModal({ t, likeListData, onClose, onProfileClick }: LikeListModalProps) {
    return (
        <div className="hub-modal-overlay" onClick={onClose}>
            <div className="hub-modal hub-like-list-modal" onClick={(e) => e.stopPropagation()}>
                <button className="hub-modal-close" onClick={onClose}>✕</button>
                <div className="hub-like-list-header">
                    <h3 className="hub-like-list-title">❤️ {t.likes || "Likes"}</h3>
                    <span className="hub-like-list-count">{likeListData.length}</span>
                </div>
                <div className="hub-like-list">
                    {likeListData.length === 0 ? (
                        <div className="hub-like-list-empty">
                            <span style={{ fontSize: 32 }}>💔</span>
                            <p>{t.noLikesYet || "No likes yet"}</p>
                        </div>
                    ) : likeListData.map((liker: any, i: number) => (
                        <button
                            key={i}
                            className="hub-like-list-item"
                            onClick={() => {
                                onClose();
                                onProfileClick(liker.liker_address);
                            }}
                        >
                            <div className="hub-like-list-avatar">
                                {liker.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={liker.avatar_url} alt="" />
                                ) : (
                                    (liker.username || "?")[0].toUpperCase()
                                )}
                            </div>
                            <div className="hub-like-list-info">
                                <span className="hub-like-list-name">{liker.username || shortAddr(liker.liker_address)}</span>
                                <span className="hub-like-list-addr">{shortAddr(liker.liker_address)}</span>
                            </div>
                            <span className="hub-like-list-view">{t.profile || "Profile"} →</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default LikeListModal;
