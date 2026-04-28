"use client";
import React, { memo } from "react";
import { shortAddr, timeAgo } from "../lib/helpers";
import ReactionPicker from "./ReactionPicker";
import MintNFTButton from "./MintNFTButton";

interface HubPostCardProps {
    post: any;
    t: Record<string, string>;
    postIdx: number;
    address?: string;
    isConnected: boolean;
    hubBookmarks: Set<number>;
    hubLikeAnim: number | null;
    shareMenuPostId: number | null;
    hubMoreOpen: number | null;
    carouselIndices: Record<number, number>;
    inlineCommentTexts: Record<number, string>;
    inlineCommentLoading: Record<number, boolean>;
    onLike: (postId: number) => void;
    onDoubleTap: (postId: number) => void;
    onBookmark: (postId: number) => void;
    onReport: (postId: number) => void;
    onOpenPost: (post: any) => void;
    onProfileClick: (address: string) => void;
    onTip: (postId: number, creatorAddress: string, creatorName: string) => void;
    onShareMenuToggle: (postId: number | null) => void;
    onMoreMenuToggle: (postId: number | null) => void;
    onCarouselChange: (postId: number, index: number) => void;
    onInlineCommentChange: (postId: number, text: string) => void;
    onInlineCommentSubmit: (postId: number) => void;
    onHashtagClick: (tag: string) => void;
    onLikeListClick: (postId: number) => void;
}

const HubPostCard = memo(function HubPostCard({
    post, t, postIdx, address, isConnected,
    hubBookmarks, hubLikeAnim, shareMenuPostId, hubMoreOpen,
    carouselIndices, inlineCommentTexts, inlineCommentLoading,
    onLike, onBookmark, onReport, onOpenPost,
    onProfileClick, onTip, onShareMenuToggle, onMoreMenuToggle,
    onCarouselChange, onInlineCommentChange, onInlineCommentSubmit,
    onHashtagClick, onLikeListClick
}: HubPostCardProps) {
    const isVideo = post.media_type === "video";
    const urlString = post.media_url || "";
    const urls = urlString.includes(",") ? urlString.split(",").filter(Boolean) : [urlString];
    const thumb = post.thumb_url || urls[0];
    const currentIndex = carouselIndices[post.id] || 0;

    return (
        <div className="hub-card" style={{ animationDelay: `${(postIdx % 15) * 0.06}s` }}>
            {/* Author Row */}
            <div className="hub-card-author-row">
                <button className="hub-card-author" onClick={(e) => { e.stopPropagation(); onProfileClick(post.author_address); }}>
                    <div className="hub-avatar">{(post.username || "?")[0].toUpperCase()}</div>
                    <div className="hub-card-author-info">
                        <span className="hub-card-author-name">{post.username || shortAddr(post.author_address)}</span>
                        <span className="hub-card-time">{timeAgo(post.created_at)}</span>
                    </div>
                </button>
                {Number(post.tip_total) > 0 && (
                    <span className="hub-card-tip-total">💰 {(Number(post.tip_total) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                )}
            </div>

            {/* Media */}
            <div className="hub-card-media" onClick={() => onOpenPost(post)} onDoubleClick={(e) => { e.stopPropagation(); onLike(post.id); }}>
                {isVideo ? (
                    <>
                        <video src={urls[0]} className="hub-card-media-content" preload="metadata" muted />
                        <div className="hub-card-play">▶</div>
                    </>
                ) : urls.length > 1 ? (
                    <div className="hub-carousel-wrapper" onClick={(e) => e.stopPropagation()}>
                        <div className="hub-carousel-track" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                            {urls.map((u: string, idx: number) => (
                                <div key={idx} className="hub-carousel-slide">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={u} alt={post.caption || ""} className="hub-card-media-content" loading="lazy" onDoubleClick={(e) => { e.stopPropagation(); onLike(post.id); }} />
                                </div>
                            ))}
                        </div>
                        {currentIndex > 0 && (
                            <div className="hub-carousel-arrow hub-carousel-arrow-prev" onClick={(e) => { e.stopPropagation(); onCarouselChange(post.id, currentIndex - 1); }}>
                                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="18" height="18"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            </div>
                        )}
                        {currentIndex < urls.length - 1 && (
                            <div className="hub-carousel-arrow hub-carousel-arrow-next" onClick={(e) => { e.stopPropagation(); onCarouselChange(post.id, currentIndex + 1); }}>
                                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="18" height="18"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                            </div>
                        )}
                        <div className="hub-carousel-dots">
                            {urls.map((_: string, idx: number) => (
                                <div key={idx} className={`hub-carousel-dot ${currentIndex === idx ? "active" : ""}`} />
                            ))}
                        </div>
                    </div>
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt={post.caption || ""} className="hub-card-media-content" loading="lazy" />
                )}
                {hubLikeAnim === post.id && <div className="hub-heart-burst">❤️</div>}
            </div>

            {/* Action Bar */}
            <div className="hub-card-actions">
                <div className="hub-card-actions-left">
                    {/* Reaction Picker (enhanced like) */}
                    <ReactionPicker
                        postId={post.id}
                        currentReaction={post.liked ? "❤️" : null}
                        reactionCounts={post.reaction_counts || {}}
                        address={address}
                        onReaction={(pid, emoji, reacted) => { onLike(pid); }}
                    />
                    <button className="hub-action" onClick={() => onOpenPost(post)}>
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
                        <span>{post.comment_count || 0}</span>
                    </button>
                    <div style={{ position: "relative" }}>
                        <button className="hub-action" onClick={(e) => { e.stopPropagation(); onShareMenuToggle(shareMenuPostId === post.id ? null : post.id); }} title={t.share || "Share"}>
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                        </button>
                        {shareMenuPostId === post.id && (
                            <div className="hub-share-popup" onClick={(e) => e.stopPropagation()}>
                                <div className="hub-share-popup-title">{t.sharePost || "Share Post"}</div>
                                <button className="hub-share-option" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/collection?post=${post.id}`); onShareMenuToggle(null); }}>
                                    <span>📋</span> {t.copyLinkShare || "Copy Link"}
                                </button>
                                <button className="hub-share-option" onClick={() => { window.open(`https://x.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/collection?post=${post.id}`)}&text=${encodeURIComponent(post.caption || "Check out this Banmao post! 🐱")}`, "_blank"); onShareMenuToggle(null); }}>
                                    <span>𝕏</span> {t.shareOnX || "X"}
                                </button>
                                <button className="hub-share-option" onClick={() => { window.open(`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/collection?post=${post.id}`)}&text=${encodeURIComponent(post.caption || "Check out this Banmao post! 🐱")}`, "_blank"); onShareMenuToggle(null); }}>
                                    <span>✈️</span> {t.shareOnTelegram || "Telegram"}
                                </button>
                                <button className="hub-share-option" onClick={() => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/collection?post=${post.id}`)}`, "_blank"); onShareMenuToggle(null); }}>
                                    <span>📘</span> {t.shareOnFacebook || "Facebook"}
                                </button>
                                <button className="hub-share-option" onClick={() => { window.open(`https://service.weibo.com/share/share.php?url=${encodeURIComponent(`${window.location.origin}/collection?post=${post.id}`)}`, "_blank"); onShareMenuToggle(null); }}>
                                    <span>💬</span> {t.shareOnWeChat || "WeChat"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="hub-card-actions-right">
                    <button className={`hub-action ${hubBookmarks.has(post.id) ? "hub-bookmarked" : ""}`} onClick={() => onBookmark(post.id)} title="Save">
                        {hubBookmarks.has(post.id) ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="hub-icon hub-icon-filled"><path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" /></svg>
                        ) : (
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                        )}
                    </button>
                    {isConnected && address?.toLowerCase() !== post.author_address?.toLowerCase() && (
                        <button className="hub-action hub-action-tip" onClick={() => onTip(post.id, post.author_address, post.username || shortAddr(post.author_address))}>
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                            {t.tip}
                        </button>
                    )}
                    {isConnected && (
                        <div className="hub-more-menu-wrap">
                            <button className="hub-more-btn" onClick={(e) => { e.stopPropagation(); onMoreMenuToggle(hubMoreOpen === post.id ? null : post.id); }} title="More">•••</button>
                            {hubMoreOpen === post.id && (
                                <div className="hub-more-dropdown">
                                    <MintNFTButton
                                        t={t}
                                        address={address}
                                        postId={post.id}
                                        mediaUrl={post.media_url || ""}
                                        caption={post.caption || ""}
                                    />
                                    {address?.toLowerCase() !== post.author_address?.toLowerCase() && (
                                        <button className="hub-more-option hub-more-danger" onClick={() => { onReport(post.id); onMoreMenuToggle(null); }}>
                                            🚩 {t.reportPost}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Caption */}
            {post.caption && (
                <div className="hub-card-caption">
                    <strong>{post.username || shortAddr(post.author_address)}</strong>{" "}{post.caption}
                </div>
            )}
            {post.hashtags && (
                <div className="hub-card-tags">
                    {post.hashtags.split(/\s+/).map((tag: string, i: number) => (
                        <button key={i} className="hub-tag-btn" onClick={() => onHashtagClick(tag)}>{tag}</button>
                    ))}
                </div>
            )}

            {/* Inline Comment Box */}
            {isConnected && address && (
                <div className="hub-inline-comment-wrap">
                    <div className="hub-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>
                        {address.slice(2, 3).toUpperCase()}
                    </div>
                    <input
                        type="text"
                        className="hub-inline-comment-input"
                        placeholder={t.commentPlaceholder || "Add a comment..."}
                        value={inlineCommentTexts[post.id] || ""}
                        onChange={(e) => onInlineCommentChange(post.id, e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && onInlineCommentSubmit(post.id)}
                        disabled={inlineCommentLoading[post.id]}
                    />
                    <button
                        className="hub-inline-comment-submit"
                        disabled={!inlineCommentTexts[post.id]?.trim() || inlineCommentLoading[post.id]}
                        onClick={() => onInlineCommentSubmit(post.id)}
                    >
                        {inlineCommentLoading[post.id] ? "⏳" : (t.commentPost || "Post")}
                    </button>
                </div>
            )}
        </div>
    );
});

export default HubPostCard;
