"use client";
import React, { memo } from "react";
import CommentSection from "./CommentSection";
import HubMediaActions from "./HubMediaActions";
import { shortAddr } from "../lib/helpers";
import type { EditorState } from "../stores/useHubStore";

interface HubPostDetailProps {
    post: any;
    t: Record<string, string>;
    address?: string;
    isConnected: boolean;
    hubBookmarks: Set<number>;
    shareMenuPostId: number | null;
    removingBg: boolean;
    editor: EditorState;
    DEFAULT_EDITOR: EditorState;

    onClose: () => void;
    onLike: (postId: number) => void;
    onBookmark: (postId: number) => void;
    onReport: (postId: number) => void;
    onTip: (postId: number, creatorAddress: string, creatorName: string) => void;
    onShareMenuToggle: (postId: number | null) => void;
    onLikeListClick: (postId: number) => void;
    onRemoveBg: (src: string, name: string) => void;
    onEdit: (post: any) => void;
    onDownloadMedia: (src: string, name: string, isVideo: boolean) => void;
    copyUrl: (url: string) => void;
}

const HubPostDetail = memo(function HubPostDetail(props: HubPostDetailProps) {
    const {
        post, t, address, isConnected, hubBookmarks,
        shareMenuPostId, removingBg,
        onClose, onLike, onBookmark, onReport,
        onTip, onShareMenuToggle, onLikeListClick,
        onRemoveBg, onEdit, onDownloadMedia, copyUrl
    } = props;

    return (
        <div className="hub-modal-overlay" onClick={onClose}>
            <div className="hub-modal hub-detail-modal" onClick={(e) => e.stopPropagation()}>
                <button className="hub-modal-close" onClick={onClose}>✕</button>
                <div className="hub-detail-media">
                    <div className="hub-detail-media-inner">
                        {post.media_type === "video" ? (
                            <video src={post.media_url} controls className="hub-detail-img" />
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.media_url} alt="" className="hub-detail-img" />
                        )}
                    </div>
                    <div className="hub-detail-media-tools">
                        <div style={{ padding: "12px 16px 0 16px" }}>
                            <HubMediaActions
                                post={post}
                                t={t}
                                removingBg={removingBg}
                                onRemoveBg={onRemoveBg}
                                onEdit={() => onEdit(post)}
                                downloadMedia={onDownloadMedia}
                            />
                        </div>

                        {/* Action Bar */}
                        <div className="hub-card-actions" style={{ padding: "12px 16px 16px 16px", marginTop: 0 }}>
                            <div className="hub-card-actions-left">
                                <button className={`hub-action ${post.liked ? "hub-liked" : ""}`} onClick={() => onLike(post.id)}>
                                    {post.liked ? (
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="hub-icon hub-icon-filled"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                                    ) : (
                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                                    )} <span className="hub-action-count" onClick={(e) => { e.stopPropagation(); onLikeListClick(post.id); }}>{post.like_count || 0}</span>
                                </button>
                                <button className="hub-action" onClick={() => {
                                    const commentInput = document.querySelector(".hub-comment-input");
                                    if (commentInput) (commentInput as HTMLInputElement).focus();
                                }}>
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
                                            <button className="hub-share-option" onClick={() => { copyUrl(`${window.location.origin}/collection?post=${post.id}`); onShareMenuToggle(null); }}>
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
                                        {t.tip || "Tip"}
                                    </button>
                                )}
                                {isConnected && address?.toLowerCase() !== post.author_address?.toLowerCase() && (
                                    <button className="hub-action hub-action-report" onClick={() => onReport(post.id)} title={t.reportPost || "Report Post"}>
                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="hub-detail-sidebar">
                    <div className="hub-post-header">
                        <div className="hub-post-author">
                            <div className="hub-avatar">{(post.username || "?")[0].toUpperCase()}</div>
                            <span className="hub-post-name">{post.username || shortAddr(post.author_address)}</span>
                        </div>
                    </div>
                    {post.caption && <div className="hub-post-caption" style={{ padding: "0 16px 12px 16px" }}>{post.caption}</div>}
                    <CommentSection t={t} postId={post.id} address={address} />
                </div>
            </div>
        </div>
    );
});

export default HubPostDetail;
