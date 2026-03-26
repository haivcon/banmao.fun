"use client";
import React, { useState, useRef, useCallback } from "react";

interface HubMediaActionsProps {
    post: any;
    t: Record<string, string>;
    onRemoveBg: (src: string, name: string) => void;
    removingBg: boolean;
    onEdit: (src: string) => void;
    downloadMedia: (src: string, name: string, isVideo: boolean) => void;
}

export default function HubMediaActions({ post, t, onRemoveBg, removingBg, onEdit, downloadMedia }: HubMediaActionsProps) {
    const [showSharePanel, setShowSharePanel] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);

    const getShareUrl = useCallback(() => {
        if (typeof window === "undefined") return "";
        return `${window.location.origin}/collection?post=${post.id}`;
    }, [post.id]);

    const copyUrl = useCallback(async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            // We could bubble up a toast event here, but default to alert for simplicity if needed
        } catch {
            const ta = document.createElement("textarea");
            ta.value = url;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
        }
    }, []);

    const shareToSocial = useCallback((platform: string) => {
        const url = getShareUrl();
        const text = t.shareTitle || "Check out this post on BanmaoHub!";
        const links: Record<string, string> = {
            twitter: `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
            telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
        };
        if (links[platform]) window.open(links[platform], "_blank", "width=600,height=400");
    }, [getShareUrl, t.shareTitle]);

    const generateQr = useCallback(async () => {
        const url = getShareUrl();
        const canvas = qrCanvasRef.current;
        if (!canvas) return;
        try {
            const QR_API = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&bgcolor=1a1a2e&color=f472b6`;
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = QR_API;
            await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; });
            canvas.width = 340;
            canvas.height = 380;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#1a1a2e";
            ctx.beginPath();
            ctx.roundRect(0, 0, 340, 380, 16);
            ctx.fill();
            ctx.drawImage(img, 20, 20, 300, 300);
            ctx.fillStyle = "#f9a8d4";
            ctx.font = "bold 16px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("banmao 🐱🍌", 170, 355);
            setShowQr(true);
        } catch (err) {
            console.error("QR generation failed:", err);
        }
    }, [getShareUrl]);

    const downloadQr = useCallback(() => {
        const canvas = qrCanvasRef.current;
        if (!canvas) return;
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `banmao_post_${post.id}_qr.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, [post.id]);

    const isVideo = post.media_type === "video";
    const mediaName = post.caption || `post_${post.id}`;

    return (
        <div className="hub-media-actions-wrapper" style={{ marginTop: '12px' }}>
            <div className="hub-media-actions-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="col-pill-btn col-pill-pink" onClick={(e) => { e.stopPropagation(); downloadMedia(post.media_url, mediaName, isVideo); }}>
                    ⬇ {t.download || "Download"}
                </button>
                {!isVideo && (
                    <button className={`col-pill-btn col-pill-green ${removingBg ? "loading" : ""}`}
                        disabled={removingBg}
                        onClick={(e) => { e.stopPropagation(); onRemoveBg(post.media_url, mediaName); }}>
                        {removingBg ? (
                            <><span className="col-remove-bg-spinner" /> {t.removingBg || "Removing..."}</>
                        ) : (
                            <>✂️ {t.removeBg || "Remove BG"}</>
                        )}
                    </button>
                )}
                <button className={`col-pill-btn col-pill-pink ${showSharePanel ? "col-fav-active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); setShowSharePanel(!showSharePanel); setShowQr(false); }}>
                    📤 {t.share || "Share"}
                </button>
                <button className={`col-pill-btn col-pill-pink ${showQr ? "col-fav-active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); if (!showQr) generateQr(); else setShowQr(false); setShowSharePanel(false); }}>
                    📱 {t.qrCode || "QR"}
                </button>
                {!isVideo && (
                    <button className="col-pill-btn col-pill-pink"
                        onClick={(e) => { e.stopPropagation(); onEdit(post.media_url); }}>
                        🎨 {t.edit || "Edit"}
                    </button>
                )}
            </div>

            {/* Share Panel */}
            {showSharePanel && (
                <div onClick={(e) => e.stopPropagation()} className="col-share-panel" style={{ marginTop: '16px', position: 'static', transform: 'none', maxWidth: '100%', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="col-share-title">{t.shareOn || "Share to..."}</div>
                    <div className="col-share-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                        <button className="col-share-btn col-share-twitter" onClick={(e) => { e.stopPropagation(); shareToSocial("twitter"); }}>
                            𝕏 Twitter
                        </button>
                        <button className="col-share-btn col-share-telegram" onClick={(e) => { e.stopPropagation(); shareToSocial("telegram"); }}>
                            ✈️ Telegram
                        </button>
                        <button className="col-share-btn col-share-facebook" onClick={(e) => { e.stopPropagation(); shareToSocial("facebook"); }}>
                            📘 Facebook
                        </button>
                        <button className="col-share-btn col-share-whatsapp" onClick={(e) => { e.stopPropagation(); shareToSocial("whatsapp"); }}>
                            💬 WhatsApp
                        </button>
                        <button className="col-share-btn col-share-copy" onClick={(e) => { e.stopPropagation(); copyUrl(getShareUrl()); setShowSharePanel(false); }}>
                            🔗 {t.copyLink || "Copy Link"}
                        </button>
                    </div>
                </div>
            )}

            {/* QR Code Panel */}
            <canvas ref={qrCanvasRef} style={{ display: "none" }} />
            {showQr && (
                <div onClick={(e) => e.stopPropagation()} className="col-qr-panel" style={{ marginTop: '16px', position: 'static', transform: 'none', maxWidth: '100%', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="col-qr-title">{t.qrCode || "QR Code"}</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCanvasRef.current?.toDataURL()} alt="QR Code" className="col-qr-img" />
                    <button className="col-pill-btn col-pill-pink" onClick={downloadQr}>
                        {t.downloadQr || "Download QR"}
                    </button>
                </div>
            )}
        </div>
    );
}
