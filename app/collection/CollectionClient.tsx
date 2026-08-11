"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import dynamic from "next/dynamic";
import "./collection.css";
import "./hub-redesign.css";
import { T, Lang, LANG_LIST } from "./i18n";
import { translateName, reverseTranslate, translateFolder, detectBrowserLang } from "./i18n/nameDict";
import { saveBgImage, getBgImage, deleteBgImage, entryToUrl } from "./bgStore";
import { ConnectButton } from "../components/wallet/WalletConnection";
import { useAccount } from "wagmi";

import CollectionStats from "./components/CollectionStats";
import CommentSection from "./components/CommentSection";
import ProfileHeader from './components/ProfileHeader';
import HubMediaActions from "./components/HubMediaActions";
import HubNotifications from "./components/HubNotifications";
import { ChatProvider, useChat } from "./components/chat/ChatProvider";
import { ChatWidget } from "./components/chat/ChatWidget";
import HubFeedView from "./components/HubFeedView";
import { DEFAULT_EDITOR as IMPORTED_DEFAULT_EDITOR } from "./stores/useHubStore";
import { useHubStore } from "./stores/useHubStore";
import { registerServiceWorker } from "./lib/notifications";
import { startOfflineSync } from "./lib/offlineMode";
import {
    appendCollectionBatch,
    collectionItemKey,
    sortCollectionItems,
    type CollectionSort,
} from "./collectionOrdering";

// Dynamic imports — modals are loaded on-demand, not in the initial bundle
const CreatePostModal = dynamic(() => import("./components/CreatePostModal"), { ssr: false });
const EditProfileModal = dynamic(() => import("./components/EditProfileModal"), { ssr: false });
const TipModal = dynamic(() => import("./components/TipModal"), { ssr: false });
const HubPostDetail = dynamic(() => import("./components/HubPostDetail"), { ssr: false });
const LikeListModal = dynamic(() => import("./components/LikeListModal"), { ssr: false });
const HubLeaderboard = dynamic(() => import("./components/HubLeaderboard"), { ssr: false });


function ChatBellButton({ onClick, t }: { onClick: () => void, t: any }) {
    const { unreadCount, clearUnread } = useChat();
    return (
        <button className="col-pill-btn col-pill-pink hub-notif-bell-btn" style={{ position: 'relative' }} onClick={() => { clearUnread(); onClick(); }} title={t.messages || "Messages"}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
            <span style={{ marginLeft: 6 }}>{t.messages || 'Messages'}</span>
            {unreadCount > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', fontSize: '10px', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                </div>
            )}
        </button>
    );
}

/* ===================== TYPES ===================== */

interface ImageItem {
    publicId: string;
    src: string;
    thumb: string;
    thumbSm: string;
    name: string;
    folder: string;
    bytes: number;
    createdAt?: string;
    type: "sticker" | "background";
    isVideo: boolean;
    duration?: number;
    width?: number;
    height?: number;
    tags?: string[];
    context?: Record<string, string>;
}

const ITEMS_PER_PAGE_DESKTOP = 24;
const ITEMS_PER_PAGE_MOBILE = 48;

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);
    return isMobile;
}

// Service worker + offline sync initialization
if (typeof window !== 'undefined') {
    registerServiceWorker();
    startOfflineSync();
}

/* ===================== HELPERS ===================== */

function publicIdToName(publicId: string): string {
    const filename = publicId.split("/").pop() || publicId;
    let name = filename.replace(/^banmao_/i, "");
    name = name.replace(/_[a-z0-9]{5,8}$/i, "");
    name = name.replace(/_\d{10,}$/, "");
    return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function folderLabel(folder: string): string {
    const last = folder.split("/").pop() || folder;
    return last.replace(/^banmao\s*/i, "").trim() || last;
}

function folderLabelTranslated(folder: string, lang: Lang): string {
    if (folder === "__hub__") return "Hub";
    const base = folderLabel(folder);
    if (lang === "en") return base;
    return translateFolder(base, lang as "vi" | "zh" | "ko" | "ru" | "id");
}

function folderIcon(folder: string): string {
    if (folder === "__hub__") return "🐱";
    const f = folder.toLowerCase();
    if (f.includes("avatar")) return "🎭";
    if (f.includes("countries") || f.includes("country")) return "🌍";
    if (f.includes("expression")) return "😺";
    if (f.includes("parody")) return "🎬";
    if (f.includes("sticker")) return "⭐";
    return "📁";
}

function toThumb(secureUrl: string, size = 400): string {
    return secureUrl.replace("/upload/", `/upload/c_fill,w_${size},h_${size},f_auto,q_auto/`);
}

function toThumbSm(secureUrl: string): string {
    return secureUrl.replace("/upload/", "/upload/c_fill,w_200,h_200,f_auto,q_60/");
}

function toVideoThumb(secureUrl: string, size = 400): string {
    // Cloudinary: get poster frame from video by converting extension to .jpg
    return secureUrl
        .replace("/video/upload/", `/video/upload/c_fill,w_${size},h_${size},f_jpg,q_auto/`)
        .replace(/\.[^.]+$/, ".jpg");
}

function formatDuration(seconds: number | undefined): string {
    if (!seconds) return "";
    const s = Math.round(seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `0:${sec.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
    return (bytes / 1073741824).toFixed(1) + " GB";
}

type ImageFormat = "png" | "jpeg" | "webp";

interface EditorState {
    brightness: number;
    contrast: number;
    saturate: number;
    blur: number;
    sepia: number;
    hueRotate: number;
    grayscale: number;
    rotate: number;
    flipH: boolean;
    flipV: boolean;
    format: ImageFormat;
}

const DEFAULT_EDITOR: EditorState = {
    brightness: 100, contrast: 100, saturate: 100,
    blur: 0, sepia: 0, hueRotate: 0, grayscale: 0,
    rotate: 0, flipH: false, flipV: false, format: "png",
};

const EDITOR_PRESETS: { key: string; emoji: string; values: Partial<EditorState> }[] = [
    { key: "original", emoji: "🔄", values: {} },
    { key: "vintage", emoji: "📜", values: { brightness: 110, contrast: 85, saturate: 70, sepia: 40 } },
    { key: "bw", emoji: "⬛", values: { grayscale: 100, contrast: 120 } },
    { key: "warm", emoji: "🌅", values: { brightness: 105, saturate: 130, sepia: 15 } },
    { key: "cool", emoji: "❄️", values: { brightness: 105, saturate: 90, contrast: 110 } },
    { key: "vivid", emoji: "🌈", values: { brightness: 110, contrast: 120, saturate: 150 } },
];

function editorFilterCSS(e: EditorState): string {
    return `brightness(${e.brightness}%) contrast(${e.contrast}%) saturate(${e.saturate}%) blur(${e.blur}px) sepia(${e.sepia}%) hue-rotate(${e.hueRotate}deg) grayscale(${e.grayscale}%)`;
}

function editorTransformCSS(e: EditorState): string {
    return `rotate(${e.rotate}deg) scaleX(${e.flipH ? -1 : 1}) scaleY(${e.flipV ? -1 : 1})`;
}

async function downloadWithEdits(src: string, name: string, editor: EditorState): Promise<boolean> {
    try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Failed to load"));
        });

        const rad = (editor.rotate * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));
        const w = Math.round(img.width * cos + img.height * sin);
        const h = Math.round(img.width * sin + img.height * cos);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;

        ctx.filter = editorFilterCSS(editor);
        ctx.translate(w / 2, h / 2);
        ctx.rotate(rad);
        ctx.scale(editor.flipH ? -1 : 1, editor.flipV ? -1 : 1);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Reset transform for watermark
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.filter = "none";
        const fontSize = Math.max(14, Math.round(w * 0.028));
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        // Shadow for readability on any background
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText("banmao.fun", w - 16, h - 12);

        const mimeMap = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = name.replace(/\s+/g, "_").toLowerCase() + "." + editor.format;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, mimeMap[editor.format], 0.92);
        return true;
    } catch {
        // Fallback: direct open
        window.open(src, "_blank");
        return false;
    }
}

// Quick download for grid cards (no edits, just blob)
async function downloadImageBlob(src: string, name: string): Promise<boolean> {
    try {
        const resp = await fetch(src);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name.replace(/\s+/g, "_").toLowerCase() + ".png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    } catch {
        window.open(src, "_blank");
        return false;
    }
}



/* ===================== SKELETON CARD ===================== */

function SkeletonCard() {
    return (
        <div className="col-card col-skeleton-card">
            <div className="col-card-img-wrap col-skeleton-shimmer">
                <div className="col-skeleton-circle" />
            </div>
            <div className="col-card-footer">
                <span className="col-skeleton-text" />
                <span className="col-skeleton-btn" />
            </div>
        </div>
    );
}

/* ===================== COMPONENTS ===================== */

const ImageCard = memo(function ImageCard({ img, t, lang, onOpen, isFav, onFav, dlCount, onDl, onDownloadToast, draggable, onDragStart, onDragOver, onDrop }: {
    img: ImageItem; t: Record<string, string>; lang: Lang;
    onOpen: (img: ImageItem) => void; isFav: boolean;
    onFav: (src: string) => void; dlCount: number; onDl: () => void;
    onDownloadToast: (success: boolean) => void;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [dlState, setDlState] = useState<"" | "downloading" | "dl-success">("");

    // Tiny blur placeholder via Cloudinary
    const blurThumb = img.thumb.replace(/w_\d+,h_\d+/, "w_20,h_20").replace(/q_auto/, "q_auto:low");

    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setIsVisible(true); obs.disconnect(); }
        }, { rootMargin: "200px" });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (dlState === "downloading") return;
        setDlState("downloading");
        onDl();
        const ok = await downloadImageBlob(img.src, img.name);
        setDlState("dl-success");
        onDownloadToast(ok);
        setTimeout(() => setDlState(""), 1500);
    };

    return (
        <div
            ref={cardRef}
            className={`col-card ${img.isVideo ? "col-card-video" : ""} ${draggable ? "col-card-draggable" : ""}`}
            onClick={() => onOpen(img)}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            <div className="col-card-img-wrap">
                {!img.isVideo && <div className="col-checker-bg" />}
                <img
                    src={isVisible ? img.thumb : blurThumb}
                    alt={img.name}
                    className={`col-card-img ${loaded ? "col-img-loaded" : "col-img-blur"}`}
                    loading="lazy"
                    onLoad={() => isVisible && setLoaded(true)}
                />
                {img.isVideo && (
                    <>
                        <div className="col-video-play-overlay">▶</div>
                        {img.duration && (
                            <span className="col-video-duration">{formatDuration(img.duration)}</span>
                        )}
                    </>
                )}
                {dlCount >= 3 && <span className="col-popular-badge">🔥</span>}
                <button
                    className={`col-fav-btn ${isFav ? "active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); onFav(img.src); }}
                    title="Favorite"
                >{isFav ? "❤️" : "🤍"}</button>
            </div>
            <div className="col-card-footer">
                <span className="col-card-name">{img.isVideo ? `🎬 ${lang !== "en" ? translateName(img.name, lang as "vi" | "zh" | "ko" | "ru" | "id") : img.name}` : (lang !== "en" ? translateName(img.name, lang as "vi" | "zh" | "ko" | "ru" | "id") : img.name)}</span>
                <button
                    className={`col-dl-btn ${dlState}`}
                    title={t.download}
                    onClick={handleDownload}
                >{dlState === "dl-success" ? "✓" : "⬇"}</button>
            </div>
        </div>
    );
});

/* ===================== MAIN PAGE ===================== */

export default function CollectionPage() {
    const isMobile = useIsMobile();
    const itemsPerPage = isMobile ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;

    // ——— Zustand Store (replaces ~50 individual useState hooks) ———
    const {
        lang, setLang,
        activeTab, setActiveTab,
        currentPage, setCurrentPage,
        searchQuery, setSearchQuery,
        showLangMenu, setShowLangMenu,
        showChatInbox, setShowChatInbox,
        allImages, setAllImages,
        folders, setFolders,
        loading, setLoading,
        totalBytes, setTotalBytes,
        toast, setToast,
        toastType, setToastType,
        theme, setTheme,
        favorites, setFavorites,
        favoritesOrder, setFavoritesOrder,
        headerHidden, setHeaderHidden,
        showScrollTop, setShowScrollTop,
        typeFilter, setTypeFilter,

        sortBy, setSortBy,
        downloadCounts, setDownloadCounts,
        deferredPrompt, setDeferredPrompt,
        showTabsMenu, setShowTabsMenu,
        translatedNames, setTranslatedNames,
        isMasonry, setIsMasonry,
        gridCols, setGridCols,
        showSortMenu, setShowSortMenu,
        isInfinite, setIsInfinite,

        // Lightbox
        lightboxIndex, setLightboxIndex,
        hubEditorOverride, setHubEditorOverride,
        dragY, setDragY,
        imgLoading, setImgLoading,
        isSlideshow, setIsSlideshow,
        editor, setEditor,
        showEditor, setShowEditor,
        showOriginal, setShowOriginal,
        removingBg, setRemovingBg,
        bgRemovedUrl, setBgRemovedUrl,
        bgRemovedName, setBgRemovedName,
        bgFailed, setBgFailed,
        editorTab, setEditorTab,
        showSharePanel, setShowSharePanel,
        showQr, setShowQr,
        teleLinkName, setTeleLinkName,
        showTeleGuide, setShowTeleGuide,

        // Hub Social
        viewMode, setViewMode,
        hubPosts, setHubPosts,
        hubLoading, setHubLoading,
        showCreatePost, setShowCreatePost,
        hubDetailPost, setHubDetailPost,
        showTipModal, setShowTipModal,
        hubFeedTab, setHubFeedTab,
        hubPage, setHubPage,
        hubHasMore, setHubHasMore,
        hubProfileFilter, setHubProfileFilter,
        topCreators, setTopCreators,
        hubLayout, setHubLayout,
        hubSearch, setHubSearch,
        hubLikeAnim, setHubLikeAnim,
        hubBookmarks, setHubBookmarks,
        showLikeList, setShowLikeList,
        likeListData, setLikeListData,
        hubMoreOpen, setHubMoreOpen,
        shareMenuPostId, setShareMenuPostId,
        showEditProfile, setShowEditProfile,
        profileRefreshTrigger, setProfileRefreshTrigger,
        hubProfileTab, setHubProfileTab,

        // Inline comments
        inlineCommentTexts, setInlineCommentTexts,
        inlineCommentLoading, setInlineCommentLoading,
        carouselIndices, setCarouselIndices,
    } = useHubStore();

    // ——— Local Refs (not suitable for global store) ———
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const translationCache = useRef<Record<string, Record<string, string>>>({});
    const sortTriggerRef = useRef<HTMLButtonElement>(null);
    const randomSeedRef = useRef(Math.floor(Math.random() * 0x7fffffff));
    const sortByRef = useRef<CollectionSort>(sortBy);
    const collectionItemsRef = useRef<ImageItem[]>([]);
    const previousSortRef = useRef<CollectionSort>(sortBy);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const isDragging = useRef(false);
    const cancelBgRef = useRef(false);
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);
    const lastScrollY = useRef(0);
    const hubLoadMoreRef = useRef<HTMLDivElement>(null);
    const [showStats, setShowStats] = useState(false);
    const hasOpenedDeepLink = useRef(false);

    // ——— Lightbox Zoom State ———
    const [zoomScale, setZoomScale] = useState(1);
    const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
    const pinchStartDist = useRef(0);
    const pinchStartScale = useRef(1);
    const lastTapTime = useRef(0);
    const panStartRef = useRef({ x: 0, y: 0 });
    const panOffsetRef = useRef({ x: 0, y: 0 });

    // Reset zoom on image change
    useEffect(() => {
        setZoomScale(1);
        setZoomOffset({ x: 0, y: 0 });
    }, [lightboxIndex]);

    const handleLightboxTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            // Pinch start
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchStartDist.current = Math.hypot(dx, dy);
            pinchStartScale.current = zoomScale;
            e.preventDefault();
        } else if (e.touches.length === 1 && zoomScale > 1) {
            // Pan start (only when zoomed)
            panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            panOffsetRef.current = { ...zoomOffset };
        }
    }, [zoomScale, zoomOffset]);

    const handleLightboxTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchStartDist.current > 0) {
            // Pinch move
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            const scale = Math.min(Math.max(pinchStartScale.current * (dist / pinchStartDist.current), 1), 5);
            setZoomScale(scale);
            e.preventDefault();
        } else if (e.touches.length === 1 && zoomScale > 1) {
            // Pan move
            const dx = e.touches[0].clientX - panStartRef.current.x;
            const dy = e.touches[0].clientY - panStartRef.current.y;
            setZoomOffset({ x: panOffsetRef.current.x + dx, y: panOffsetRef.current.y + dy });
            e.preventDefault();
        }
    }, [zoomScale]);

    const handleLightboxTouchEnd = useCallback((e: React.TouchEvent) => {
        pinchStartDist.current = 0;
        // Double-tap detection
        if (e.changedTouches.length === 1) {
            const now = Date.now();
            if (now - lastTapTime.current < 300) {
                // Double-tap: toggle zoom
                if (zoomScale > 1) {
                    setZoomScale(1);
                    setZoomOffset({ x: 0, y: 0 });
                } else {
                    setZoomScale(2.5);
                }
                lastTapTime.current = 0;
            } else {
                lastTapTime.current = now;
            }
        }
        // Reset offset if zoom back to 1
        if (zoomScale <= 1) {
            setZoomOffset({ x: 0, y: 0 });
        }
    }, [zoomScale]);

    // Fix gridCols for mobile (store defaults to 5, but mobile needs 3)
    useEffect(() => {
        if (isMobile && gridCols === 5) setGridCols(3);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const t = T[lang];

    // ——— Hub Social Feed ———
    const { address, isConnected } = useAccount();

    const openHubPost = (post: any) => {
        setHubDetailPost(post);
    };

    const openPostById = async (postId: number) => {
        setViewMode("hub"); // Ensure we are in hub view
        const localPost = hubPosts.find((p) => p.id === postId);
        if (localPost) {
            openHubPost(localPost);
            return;
        }
        try {
            const res = await fetch(`/api/hub/posts/${postId}`);
            const data = await res.json();
            if (data.post) {
                openHubPost(data.post);
            }
        } catch (err) {
            console.error("Failed to fetch post by ID:", err);
        }
    };

    // Fetch hub posts (with pagination)
    const fetchHubPosts = useCallback(async (reset = true) => {
        if (reset) setHubLoading(true);
        try {
            const offset = reset ? 0 : hubPosts.length;
            const params = new URLSearchParams({ limit: "24", offset: String(offset) });

            if (hubFeedTab === "mine" && address) {
                params.set("author", address);
            } else if (hubProfileFilter) {
                if (hubProfileTab === "posts") {
                    params.set("author", hubProfileFilter);
                } else if (hubProfileTab === "liked") {
                    params.set("likedBy", hubProfileFilter);
                } else if (hubProfileTab === "saved") {
                    params.set("bookmarked", "true");
                    params.set("viewer", hubProfileFilter); // must send viewer to filter bookmarks
                }
            }

            if (address && hubProfileTab !== "saved") {
                params.set("viewer", address);
            }

            if (hubFeedTab !== "mine" && !hubProfileFilter) {
                params.set("sort", hubFeedTab);
            }

            const res = await fetch(`/api/hub/posts?${params}`);
            const data = await res.json();
            if (data.posts) {
                if (reset) setHubPosts(data.posts);
                else setHubPosts(prev => [...prev, ...data.posts]);
                setHubHasMore(data.posts.length >= 24);
            }
            if (reset) setHubPage(1);
            else setHubPage(p => p + 1);
        } catch (e) { console.error("Hub fetch error:", e); }
        finally { setHubLoading(false); }
    }, [hubFeedTab, address, hubProfileFilter, hubProfileTab, hubPosts.length]);

    // Fetch top creators
    const fetchTopCreators = useCallback(async () => {
        try {
            const res = await fetch('/api/hub/tips?top=true');
            const data = await res.json();
            if (data.creators) setTopCreators(data.creators);
        } catch { /* ignore */ }
    }, []);

    // Auto-fetch when switching to hub
    useEffect(() => {
        if (viewMode === "hub") { fetchHubPosts(true); fetchTopCreators(); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, hubFeedTab, hubProfileFilter, fetchHubPosts, fetchTopCreators]);

    // Infinite scroll observer
    useEffect(() => {
        if (viewMode !== "hub" || !hubLoadMoreRef.current) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && hubHasMore && !hubLoading) fetchHubPosts(false);
        }, { rootMargin: '200px' });
        obs.observe(hubLoadMoreRef.current);
        return () => obs.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, hubHasMore, hubLoading, fetchHubPosts]);

    const handleLike = useCallback(async (postId: number) => {
        if (!address) return;
        // Optimistic update
        setHubPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: !p.liked, like_count: p.liked ? Math.max(0, (p.like_count || 0) - 1) : (p.like_count || 0) + 1 } : p));
        try {
            const res = await fetch("/api/hub/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId, address }) });
            if (!res.ok) throw new Error('Like API failed');
        } catch {
            // Rollback on failure
            setHubPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: !p.liked, like_count: p.liked ? Math.max(0, (p.like_count || 0) - 1) : (p.like_count || 0) + 1 } : p));
        }
    }, [address]);

    // Double-tap to like
    const handleDoubleTap = useCallback((postId: number) => {
        if (!address) return;
        const post = hubPosts.find(p => p.id === postId);
        if (post && !post.liked) handleLike(postId);
        setHubLikeAnim(postId);
        setTimeout(() => setHubLikeAnim(null), 800);
    }, [address, hubPosts, handleLike]);

    // Fetch user bookmarks
    const fetchBookmarks = useCallback(async () => {
        if (!address) return;
        try {
            const res = await fetch(`/api/hub/bookmarks?address=${address}`);
            const data = await res.json();
            if (data.bookmarks) setHubBookmarks(new Set(data.bookmarks));
        } catch { /* ignore */ }
    }, [address]);

    useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

    const handleBookmark = useCallback(async (postId: number) => {
        if (!address) return;
        setHubBookmarks(prev => {
            const next = new Set(prev);
            next.has(postId) ? next.delete(postId) : next.add(postId);
            return next;
        });
        await fetch("/api/hub/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId, address }) });
    }, [address]);

    const handleReport = useCallback(async (postId: number) => {
        if (!address) return;
        const reason = window.prompt("Reason for reporting this post?");
        if (reason === null) return; // cancelled
        try {
            await fetch("/api/hub/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId, address, reason })
            });
            alert("Post reported to admin. Thank you.");
        } catch { /* ignore */ }
    }, [address]);

    const handleHubScroll = useCallback((e: any) => {
        // This function will be implemented later
        // For now, it's a placeholder to fix the syntax
    }, []);

    const handleInlineCommentSubmit = async (postId: number) => {
        const text = inlineCommentTexts[postId]?.trim();
        if (!text || !address) return;

        setInlineCommentLoading(prev => ({ ...prev, [postId]: true }));
        try {
            await fetch("/api/hub/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId, address, text, parentId: null }),
            });
            setInlineCommentTexts(prev => ({ ...prev, [postId]: '' }));

            // Optimistically update comment count
            setHubPosts(prev => prev.map(p =>
                p.id === postId ? { ...p, comment_count: (Number(p.comment_count) || 0) + 1 } : p
            ));

            if (typeof window !== 'undefined' && (window as any).toast) {
                (window as any).toast.success(t.commentPosted || "Comment submitted!");
            }
        } catch (e) {
            console.error("Inline comment error:", e);
        } finally {
            setInlineCommentLoading(prev => ({ ...prev, [postId]: false }));
        }
    };

    // Fetch like list
    const fetchLikeList = useCallback(async (postId: number) => {
        try {
            const res = await fetch(`/api/hub/likes?postId=${postId}`);
            const data = await res.json();
            if (data.likers) setLikeListData(data.likers);
            setShowLikeList(postId);
        } catch { /* ignore */ }
    }, []);

    const shortAddr = useCallback((addr: string) => addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "", []);
    const timeAgo = useCallback((ts: number) => {
        const diff = Date.now() - ts;
        if (diff < 60000) return "now";
        if (diff < 3600000) return Math.floor(diff / 60000) + "m";
        if (diff < 86400000) return Math.floor(diff / 3600000) + "h";
        return Math.floor(diff / 86400000) + "d";
    }, []);

    // ——— Helper: map raw API resource to ImageItem ———
    const mapRawToItem = useCallback((img: { public_id: string; secure_url: string; folder: string; bytes: number; created_at?: string; resource_type?: string; duration?: number; width?: number; height?: number; tags?: string[]; context?: Record<string, string> }): ImageItem | null => {
        if (img.resource_type === "raw") return null;
        const isVideo = img.resource_type === "video";
        let folder = img.folder;
        if (folder.endsWith("/a_prompt")) folder = folder.replace(/\/a_prompt$/, "");
        if (/\/hub\/0x[a-f0-9]/i.test(folder)) folder = "__hub__";
        return {
            publicId: img.public_id,
            src: img.secure_url,
            thumb: isVideo ? toVideoThumb(img.secure_url) : toThumb(img.secure_url),
            thumbSm: isVideo ? toVideoThumb(img.secure_url, 200) : toThumbSm(img.secure_url),
            name: publicIdToName(img.public_id),
            folder,
            bytes: img.bytes || 0,
            createdAt: img.created_at,
            type: "sticker" as const,
            isVideo,
            duration: img.duration,
            width: img.width,
            height: img.height,
            tags: img.tags || [],
            context: img.context || {},
        };
    }, []);

    // ——— Helper: sort folders by category type + count ———
    const sortFolders = useCallback((items: ImageItem[]): string[] => {
        const uniqueFolders = [...new Set(items.map((i: ImageItem) => i.folder))];
        const folderCounts = new Map<string, number>();
        for (const item of items) {
            folderCounts.set(item.folder, (folderCounts.get(item.folder) || 0) + 1);
        }
        uniqueFolders.sort((a, b) => {
            const aLabel = folderLabel(a);
            const bLabel = folderLabel(b);
            const aIsGroup = /^Group\d+/i.test(aLabel);
            const bIsGroup = /^Group\d+/i.test(bLabel);
            const aIsHub = a === "__hub__";
            const bIsHub = b === "__hub__";
            if (aIsHub && !bIsHub) return 1;
            if (!aIsHub && bIsHub) return -1;
            if (!aIsGroup && !aIsHub && aIsGroup !== bIsGroup) return -1;
            if (!bIsGroup && !bIsHub && aIsGroup !== bIsGroup) return 1;
            if (aIsGroup && bIsGroup) {
                const aNum = parseInt(aLabel.match(/\d+/)?.[0] || "0", 10);
                const bNum = parseInt(bLabel.match(/\d+/)?.[0] || "0", 10);
                return aNum - bNum;
            }
            if (!aIsGroup && !bIsGroup && !aIsHub && !bIsHub) {
                const countDiff = (folderCounts.get(b) || 0) - (folderCounts.get(a) || 0);
                if (countDiff !== 0) return countDiff;
            }
            return aLabel.localeCompare(bLabel);
        });
        return uniqueFolders;
    }, []);

    // ——— Progressive paginated fetch ———
    const [loadProgress, setLoadProgress] = useState<{ loaded: number; total: number } | null>(null);

    useEffect(() => {
        let cancelled = false;
        const BATCH_SIZE = 500;

        async function fetchAllPages() {
            let cursor: string | null = null;
            collectionItemsRef.current = [];
            let isFirstBatch = true;

            do {
                const params = new URLSearchParams({ folder: "banmao", limit: String(BATCH_SIZE) });
                if (cursor) params.set("cursor", cursor);

                const res = await fetch(`/api/collection?${params}`);
                if (!res.ok) throw new Error(`Collection request failed: ${res.status}`);
                const data = await res.json();
                if (cancelled) return;

                const batchItems = (data.images || [])
                    .map(mapRawToItem)
                    .filter((item: ImageItem | null): item is ImageItem => item !== null);

                collectionItemsRef.current = appendCollectionBatch(
                    collectionItemsRef.current,
                    batchItems,
                    sortByRef.current,
                    randomSeedRef.current,
                );

                // Append each deduplicated batch without moving cards already rendered.
                setAllImages(collectionItemsRef.current);
                setFolders(sortFolders(collectionItemsRef.current));
                setTotalBytes(collectionItemsRef.current.reduce((sum, i) => sum + i.bytes, 0));
                setLoadProgress({ loaded: collectionItemsRef.current.length, total: data.total || collectionItemsRef.current.length });

                // Clear full-page skeleton after first batch
                if (isFirstBatch) {
                    setLoading(false);
                    isFirstBatch = false;
                }

                cursor = data.nextCursor || null;
            } while (cursor && !cancelled);

            // All done
            if (!cancelled) setLoadProgress(null);
        }

        fetchAllPages().catch((err) => {
            console.error("Failed to fetch images:", err);
            if (!cancelled) setLoading(false);
        });

        return () => { cancelled = true; };
    }, [mapRawToItem, sortFolders]);




    // ——— Deep Link & Initial State from URL ———
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const postParam = params.get("post");
        const profileParam = params.get("profile");
        const vParam = params.get("v") as typeof viewMode;
        const tabParam = params.get("tab");
        const ptabParam = params.get("ptab") as typeof hubProfileTab;
        const qParam = params.get("q");
        const sortParam = params.get("sort") as typeof sortBy;

        // 1. Set View Mode
        let currentView = viewMode;
        if (vParam === "hub" || vParam === "gallery") {
            setViewMode(vParam);
            currentView = vParam;
        }

        // 2. Set Tabs
        if (tabParam) {
            if (currentView === "hub") setHubFeedTab(tabParam as any);
            else setActiveTab(tabParam);
        }
        if (ptabParam) setHubProfileTab(ptabParam);

        // 3. Set Search & Filters
        if (qParam) {
            setSearchQuery(qParam);
            setHubSearch(qParam);
        }
        if (sortParam) setSortBy(sortParam);

        // 4. Handle ?profile= deep link
        if (profileParam && !hubProfileFilter) {
            if (currentView !== "hub") setViewMode("hub");
            setHubProfileFilter(profileParam);
        }

        // 5. Handle ?post= deep link
        if (!postParam) return;

        // Function to set post and switch mode
        const openDeepLink = (post: any) => {
            if (viewMode === "hub" || currentView === "hub") {
                setHubDetailPost(post);
            } else {
                setViewMode("hub");
                setTimeout(() => setHubDetailPost(post), 100);
            }
        };

        // Check local state first
        if (hubPosts.length > 0) {
            const localPost = hubPosts.find(p => p.id?.toString() === postParam);
            if (localPost) {
                openDeepLink(localPost);
                return;
            }
        }

        // If not in local array (e.g. paginated out), fetch directly
        fetch(`/api/hub/posts/${postParam}`)
            .then(res => res.json())
            .then(data => {
                if (data.post) openDeepLink(data.post);
            })
            .catch(err => console.error("Failed to fetch deep linked post:", err));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount for deep links

    // ——— Sync Application State to URL ———
    useEffect(() => {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        let changed = false;

        const updateParam = (key: string, value: string | null | undefined) => {
            if (value && value !== "") {
                if (params.get(key) !== value) {
                    params.set(key, value);
                    changed = true;
                }
            } else {
                if (params.has(key)) {
                    params.delete(key);
                    changed = true;
                }
            }
        };

        // Sync viewMode
        updateParam('v', viewMode === 'hub' ? 'hub' : null); // only show if hub

        // Sync Tabs & Filters
        if (viewMode === 'hub') {
            updateParam('tab', hubFeedTab !== 'newest' ? hubFeedTab : null);
            updateParam('q', hubSearch);
            updateParam('sort', null);

        } else {
            updateParam('tab', activeTab !== 'all' ? activeTab : null);
            updateParam('q', searchQuery);
            updateParam('sort', sortBy !== 'random' ? sortBy : null);

        }

        // Sync Profile Data
        updateParam('profile', hubProfileFilter);
        if (hubProfileFilter) {
            updateParam('ptab', hubProfileTab !== 'posts' ? hubProfileTab : null);
        } else {
            updateParam('ptab', null);
        }

        // Sync Post Details
        updateParam('post', hubDetailPost?.id?.toString());

        if (changed) {
            window.history.pushState({}, '', url);
        }
    }, [viewMode, hubFeedTab, activeTab, hubProfileFilter, hubProfileTab, searchQuery, hubSearch, hubDetailPost, sortBy]);

    // ——— Handle browser back/forward button ———
    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const profileParam = params.get('profile');
            const postParam = params.get('post');
            const vParam = params.get('v');
            const tabParam = params.get('tab');
            const ptabParam = params.get('ptab');
            const qParam = params.get('q');

            // Sync View Mode
            setViewMode(vParam === 'hub' ? 'hub' : 'gallery');

            // Sync Search
            setSearchQuery(qParam || '');
            setHubSearch(qParam || '');

            // Sync Tabs
            if (vParam === 'hub') {
                setHubFeedTab((tabParam as any) || 'newest');
            } else {
                setActiveTab(tabParam || 'all');
            }

            // Sync profile
            if (profileParam !== hubProfileFilter) {
                setHubProfileFilter(profileParam);
            }
            if (ptabParam) setHubProfileTab(ptabParam as any);

            // Sync gallery filters
            if (vParam !== 'hub') {
                setSortBy((params.get('sort') as any) || 'random');

            }

            // Sync post detail
            if (!postParam && hubDetailPost) {
                setHubDetailPost(null);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [hubProfileFilter, hubDetailPost]);

    // ——— Favorites from localStorage or URL Hash ———
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Check for shared URL hash first
        if (window.location.hash.startsWith("#share=")) {
            try {
                const encoded = window.location.hash.replace("#share=", "");
                const decoded = atob(encoded); // base64 decode
                const sharedList = JSON.parse(decoded);
                if (Array.isArray(sharedList)) {
                    setFavorites(new Set(sharedList));
                    setFavoritesOrder(sharedList);
                    setActiveTab("favorites");
                    // Optionally save to local storage immediately, or let them just view it
                    localStorage.setItem("banmao_favorites", JSON.stringify(sharedList));
                    localStorage.setItem("banmao_favorites_order", JSON.stringify(sharedList));

                    // Clean up URL
                    window.history.replaceState("", document.title, window.location.pathname + window.location.search);
                }
            } catch (e) {
                console.error("Failed to parse shared favorites", e);
            }
        } else {
            const saved = localStorage.getItem("banmao_favorites");
            if (saved) { try { setFavorites(new Set(JSON.parse(saved))); } catch { /* ignore */ } }
            const savedOrder = localStorage.getItem("banmao_favorites_order");
            if (savedOrder) setFavoritesOrder(JSON.parse(savedOrder));
        }

        // Load download counts
        const counts = localStorage.getItem("banmao_dl_counts");
        if (counts) { try { setDownloadCounts(JSON.parse(counts)); } catch { /* ignore */ } }
    }, []);

    const incrementDownloadCount = useCallback((name: string) => {
        setDownloadCounts(prev => {
            const updated = { ...prev, [name]: (prev[name] || 0) + 1 };
            localStorage.setItem("banmao_dl_counts", JSON.stringify(updated));
            return updated;
        });
    }, []);

    // ——— Download Toast Helper ———
    const showToast = useCallback((message: string, type: "" | "col-toast-success" | "col-toast-error" = "") => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast(message);
        setToastType(type);
        toastTimer.current = setTimeout(() => { setToast(null); setToastType(""); }, 2800);
    }, []);

    const handleDownloadToast = useCallback((success: boolean) => {
        showToast(success ? t.downloadSuccess : t.downloadFailed, success ? "col-toast-success" : "col-toast-error");
    }, [showToast, t.downloadSuccess, t.downloadFailed]);

    // Lightbox download button state
    const [lbDownloading, setLbDownloading] = useState<"" | "downloading" | "dl-success">("");

    // ——— AI Prompt & Share Link State ———
    const [promptsCache, setPromptsCache] = useState<Record<string, { prompts: any[], shareLinks: Record<string, string>, hasPrompts: boolean }>>({});
    const [showPromptPanel, setShowPromptPanel] = useState(false);
    const [currentPrompt, setCurrentPrompt] = useState<{ id?: number, prompt: string, share_link?: string } | null>(null);
    const [currentShareLink, setCurrentShareLink] = useState<string | null>(null);
    const [promptLoading, setPromptLoading] = useState(false);

    // ——— PWA Install Prompt & Service Worker ———
    useEffect(() => {
        // PWA Install Prompt
        const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
        window.addEventListener("beforeinstallprompt", handler);

        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const installPwa = useCallback(async () => {
        if (!deferredPrompt) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (deferredPrompt as any).prompt();
        setDeferredPrompt(null);
    }, [deferredPrompt]);

    // ——— Translate image names when language changes (offline dictionary) ———
    useEffect(() => {
        if (lang === "en" || allImages.length === 0) {
            setTranslatedNames({});
            return;
        }
        if (translationCache.current[lang]) {
            setTranslatedNames(translationCache.current[lang]);
            return;
        }
        const result: Record<string, string> = {};
        const uniqueNames = [...new Set(allImages.map(i => i.name))];
        for (const name of uniqueNames) {
            result[name] = translateName(name, lang as "vi" | "zh" | "ko" | "ru" | "id");
        }
        translationCache.current[lang] = result;
        setTranslatedNames(result);
    }, [lang, allImages]);


    const toggleFav = useCallback((src: string) => {
        setFavorites((prev) => {
            const next = new Set(prev);
            if (next.has(src)) next.delete(src); else next.add(src);
            localStorage.setItem("banmao_favorites", JSON.stringify([...next]));

            setFavoritesOrder(prevOrder => {
                let newOrder = [...prevOrder];
                if (next.has(src) && !newOrder.includes(src)) newOrder.push(src);
                else if (!next.has(src)) newOrder = newOrder.filter(id => id !== src);
                localStorage.setItem("banmao_favorites_order", JSON.stringify(newOrder));
                return newOrder;
            });

            return next;
        });
    }, []);

    // Load initial favorites order (moved logic into the main mount effect above)

    // Re-sort only when the user changes the selected sort. Network batches use
    // the active sort for their own new items, then append below this sequence.
    useEffect(() => {
        sortByRef.current = sortBy;
        if (previousSortRef.current === sortBy) return;
        previousSortRef.current = sortBy;
        collectionItemsRef.current = sortCollectionItems(
            collectionItemsRef.current,
            sortBy,
            randomSeedRef.current,
        );
        setAllImages(collectionItemsRef.current);
    }, [sortBy, setAllImages]);

    // ——— Filter by tab + search + type + sort ———
    const filteredImages = useMemo(() => {
        let filtered = allImages;
        if (activeTab === "favorites") {
            filtered = allImages.filter((i) => favorites.has(i.src));
        } else if (activeTab !== "all") {
            filtered = allImages.filter((i) => i.folder === activeTab);
        }
        // Type filter
        if (typeFilter === "images") filtered = filtered.filter(i => !i.isVideo);
        if (typeFilter === "videos") filtered = filtered.filter(i => i.isVideo);



        // Search (cross-language)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            if (lang !== "en") {
                const keywords = reverseTranslate(searchQuery, lang as "vi" | "zh" | "ko" | "ru" | "id");
                filtered = filtered.filter((i) => {
                    const nameLower = i.name.toLowerCase();
                    return keywords.some(kw => nameLower.includes(kw)) || nameLower.includes(q);
                });
            } else {
                filtered = filtered.filter((i) => i.name.toLowerCase().includes(q));
            }
        }

        // Custom sort for favorites tab
        if (activeTab === "favorites" && sortBy === "name") {
            return filtered.sort((a, b) => {
                const indexA = favoritesOrder.indexOf(a.src);
                const indexB = favoritesOrder.indexOf(b.src);
                if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name) || collectionItemKey(a).localeCompare(collectionItemKey(b));
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB || collectionItemKey(a).localeCompare(collectionItemKey(b)); // Ascending based on array order
            });
        }

        return filtered;
    }, [allImages, activeTab, searchQuery, favorites, favoritesOrder, typeFilter, sortBy]);

    // ——— Deep Link: auto-open lightbox from URL param ———
    useEffect(() => {
        if (filteredImages.length === 0 || hasOpenedDeepLink.current) return;
        const params = new URLSearchParams(window.location.search);
        const imgParam = params.get("img");
        if (!imgParam) {
            hasOpenedDeepLink.current = true;
            return;
        }
        const idx = filteredImages.findIndex(i => i.src.includes(imgParam) || i.name.toLowerCase().replace(/\s+/g, "_") === imgParam.toLowerCase());
        if (idx >= 0) {
            setLightboxIndex(idx);
            setImgLoading(true);
            hasOpenedDeepLink.current = true; // Prevent re-triggering when grid sorts/filters
        }
    }, [filteredImages]);

    // ——— Pagination / Infinite Scroll ———
    const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
    // Virtual Scroll / Infinite Load: render all items from page 1 up to currentPage if infinite, else just current page
    const displayImages = isInfinite
        ? filteredImages.slice(0, currentPage * itemsPerPage)
        : filteredImages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Infinite scroll observer setup
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
        if (loading) return;
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && currentPage < totalPages) {
                setCurrentPage(prev => prev + 1);
            }
        }, { rootMargin: "400px" });
        if (node) observerRef.current.observe(node);
    }, [loading, currentPage, totalPages]);

    // Reset on tab/search change
    const handleTabChange = useCallback((tab: string) => {
        setActiveTab(tab);
        setCurrentPage(1);
        setShowTabsMenu(false);
    }, []);

    // ——— Share Favorites ———
    const handleShareFavorites = useCallback(() => {
        if (favoritesOrder.length === 0 && favorites.size === 0) {
            setToast("No favorites to share!");
            setTimeout(() => setToast(null), 3000);
            return;
        }

        // Use favoritesOrder if available to preserve custom sorting, else fallback to standard array
        const listToShare = favoritesOrder.length > 0 ? favoritesOrder : Array.from(favorites);

        try {
            const encoded = btoa(JSON.stringify(listToShare));
            const shareUrl = `${window.location.origin}${window.location.pathname}?img=#share=${encoded}`;

            navigator.clipboard.writeText(shareUrl).then(() => {
                setToast("Share link copied to clipboard!");
                setTimeout(() => setToast(null), 3000);
            }).catch(() => {
                // Fallback for some browsers
                setToast("Failed to copy link. Check console.");
                console.warn("Share URL:", shareUrl);
                setTimeout(() => setToast(null), 3000);
            });
        } catch (e) {
            console.error("Failed to generate share link", e);
        }
    }, [favorites, favoritesOrder]);

    const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    }, []);

    // ——— Sticky header + scroll-to-top ———
    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY;
            setHeaderHidden(y > 200 && y > lastScrollY.current);
            setShowScrollTop(y > 500);
            lastScrollY.current = y;
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const scrollToTop = useCallback(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    // ——— Language ———
    useEffect(() => {
        if (typeof window === "undefined") return;
        const saved = localStorage.getItem("banmao_language") as Lang | null;
        if (saved && T[saved]) { setLang(saved); return; }
        const browserLang = navigator.language.split("-")[0].toLowerCase();
        if (T[browserLang as Lang]) setLang(browserLang as Lang);
    }, []);

    // ——— Theme ———
    useEffect(() => {
        if (typeof window === "undefined") return;
        const saved = localStorage.getItem("banmao_theme") as "dark" | "light" | null;
        if (saved) { setTheme(saved); return; }
        if (window.matchMedia("(prefers-color-scheme: light)").matches) setTheme("light");
    }, []);

    const toggleTheme = useCallback((e?: React.MouseEvent) => {
        // Ripple effect
        if (e) {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const ripple = document.createElement("div");
            ripple.className = "col-theme-ripple";
            const size = Math.max(window.innerWidth, window.innerHeight) * 2;
            ripple.style.width = ripple.style.height = size + "px";
            ripple.style.left = rect.left + rect.width / 2 - size / 2 + "px";
            ripple.style.top = rect.top + rect.height / 2 - size / 2 + "px";
            document.body.appendChild(ripple);
            setTimeout(() => ripple.remove(), 800);
        }
        setTheme((prev) => {
            const next = prev === "dark" ? "light" : "dark";
            localStorage.setItem("banmao_theme", next);
            return next;
        });
    }, []);

    const handleLangChange = useCallback((newLang: Lang) => {
        setLang(newLang);
        localStorage.setItem("banmao_language", newLang);
        setShowLangMenu(false);
    }, []);

    // ——— Lightbox ———
    const openLightbox = useCallback((img: ImageItem) => {
        const idx = filteredImages.findIndex((i) => i.src === img.src);
        setLightboxIndex(idx >= 0 ? idx : 0);
        setDragY(0);
        setImgLoading(true);
        setEditor({ ...DEFAULT_EDITOR });
        setShowEditor(false);
        setShowSharePanel(false);
        setShowQr(false);
        // Update URL for deep link
        const name = img.name.toLowerCase().replace(/\s+/g, "_");
        window.history.replaceState(null, "", `?img=${encodeURIComponent(name)}`);
    }, [filteredImages]);

    const closeLightbox = useCallback(() => {
        setLightboxIndex(null); setDragY(0); setImgLoading(false);
        setHubEditorOverride(null);
        setEditor({ ...DEFAULT_EDITOR }); setShowEditor(false);
        setIsSlideshow(false); // Stop slideshow
        setEditorTab(0);
        setShowSharePanel(false);
        setShowQr(false);
        // Revoke blob URL to free memory
        setBgRemovedUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
        setBgRemovedName("");
        // Clear URL param
        window.history.replaceState(null, "", window.location.pathname);
    }, []);

    const lightboxPrev = useCallback(() => {
        setImgLoading(true);
        setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
    }, []);

    const lightboxNext = useCallback(() => {
        setImgLoading(true);
        setLightboxIndex((i) => (i !== null && i < filteredImages.length - 1 ? i + 1 : i));
    }, [filteredImages.length]);

    // Keyboard
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (lightboxIndex === null && !hubEditorOverride) return;
            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowLeft") lightboxPrev();
            if (e.key === "ArrowRight") lightboxNext();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [lightboxIndex, hubEditorOverride, closeLightbox, lightboxPrev, lightboxNext]);

    // Slideshow Auto-Advance
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isSlideshow && lightboxIndex !== null) {
            timer = setInterval(() => {
                lightboxNext();
            }, 3000); // 3 seconds per image
        }
        return () => clearInterval(timer);
    }, [isSlideshow, lightboxIndex, lightboxNext]);

    // Touch: swipe left/right + swipe DOWN to close
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        isDragging.current = false;
    }, []);

    // Drag and Drop ordering for Favorites
    const [draggedItemSrc, setDraggedItemSrc] = useState<string | null>(null);

    const handleDragStartItem = (e: React.DragEvent, src: string) => {
        e.dataTransfer.effectAllowed = "move";
        setDraggedItemSrc(src);
    };

    const handleDragOverItem = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = "move";
    };

    const handleDropItem = (e: React.DragEvent, targetSrc: string) => {
        e.preventDefault();
        if (!draggedItemSrc || draggedItemSrc === targetSrc) return;

        setFavoritesOrder(prevOrder => {
            const newOrder = [...prevOrder];
            const draggedIdx = newOrder.indexOf(draggedItemSrc);
            const targetIdx = newOrder.indexOf(targetSrc);

            if (draggedIdx !== -1 && targetIdx !== -1) {
                // Remove from old position and insert at new position
                newOrder.splice(draggedIdx, 1);
                newOrder.splice(targetIdx, 0, draggedItemSrc);
                localStorage.setItem("banmao_favorites_order", JSON.stringify(newOrder));
            }
            return newOrder;
        });
        setDraggedItemSrc(null);
    };

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const dy = e.touches[0].clientY - touchStartY.current;
        if (dy > 10) { isDragging.current = true; setDragY(dy); }
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;

        // Swipe down to close
        if (isDragging.current && dy > 120) { closeLightbox(); return; }
        setDragY(0);
        isDragging.current = false;

        // Swipe left/right
        if (Math.abs(dx) > 60 && Math.abs(dy) < 80) {
            if (dx > 0) lightboxPrev();
            else lightboxNext();
        }
    }, [lightboxPrev, lightboxNext, closeLightbox]);

    const currentLightboxImage = hubEditorOverride
        ? hubEditorOverride
        : (lightboxIndex !== null ? filteredImages[lightboxIndex] : null);

    // Load saved BG from IndexedDB when navigating images
    useEffect(() => {
        if (!currentLightboxImage) return;
        // Revoke previous blob URL to prevent memory leak
        setBgRemovedUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
        setBgRemovedName("");
        getBgImage(currentLightboxImage.src).then(entry => {
            if (entry) {
                setBgRemovedUrl(entryToUrl(entry));
                setBgRemovedName(entry.name);
            }
        }).catch(err => console.error("Failed to load saved BG:", err));
        
        // Reset prompt logic
        setCurrentPrompt(null);
        setCurrentShareLink(null);
        setShowPromptPanel(false);

        const folder = currentLightboxImage.folder;
        if (!folder) return;

        const updatePromptState = (cacheData: any) => {
            console.log("updatePromptState: cacheData=", cacheData, "for folder=", folder);
            if (!cacheData || (!cacheData.hasPrompts && !cacheData.shareLinks)) {
                console.log("No prompts or sharelinks found in cacheData");
                return;
            }
            
            // Try to extract the first number from the name as the prompt ID
            const nameMatch = currentLightboxImage.name.match(/(\d+)/);
            const promptId = nameMatch ? parseInt(nameMatch[1], 10) : (lightboxIndex !== null ? lightboxIndex + 1 : 1);
            console.log("Extracted promptId=", promptId, "from name=", currentLightboxImage.name);
            
            let matchedPrompt = null;
            if (cacheData.prompts && cacheData.prompts.length > 0) {
                matchedPrompt = cacheData.prompts.find((p: any) => p.id === promptId) || cacheData.prompts[Math.min(promptId - 1, cacheData.prompts.length - 1)];
                setCurrentPrompt(matchedPrompt);
                console.log("Matched prompt:", matchedPrompt);
            }
            
            // Check share links
            let sl = matchedPrompt?.share_link;
            if (!sl && cacheData.shareLinks) {
                // Try original name
                const filename = currentLightboxImage.src.split("/").pop() || "";
                sl = cacheData.shareLinks[filename] 
                    || cacheData.shareLinks[filename.replace(/\.[^/.]+$/, "")]
                    || cacheData.shareLinks[`prompt_${promptId}`];
            }
            if (sl) setCurrentShareLink(sl);
        };

        if (promptsCache[folder]) {
            updatePromptState(promptsCache[folder]);
        } else {
            setPromptLoading(true);
            const ts = Date.now();
            fetch(`/api/collection/prompts?folder=${encodeURIComponent(folder)}&_t=${ts}`)
                .then(r => r.json())
                .then(data => {
                    setPromptsCache(prev => ({ ...prev, [folder]: data }));
                    updatePromptState(data);
                })
                .catch(err => console.error("Failed to fetch prompts:", err))
                .finally(() => setPromptLoading(false));
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentLightboxImage?.src]);

    // ——— Copy URL ———
    const copyUrl = useCallback(async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setToast(t.copied);
        } catch {
            const ta = document.createElement("textarea");
            ta.value = url;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setToast(t.copied);
        }
        setTimeout(() => setToast(null), 2500);
    }, [t.copied]);

    // ——— Social Share ———
    const getShareUrl = useCallback(() => {
        if (typeof window === "undefined") return "";
        return window.location.href;
    }, []);

    const shareToSocial = useCallback((platform: string) => {
        const url = getShareUrl();
        const text = t.shareTitle;
        const links: Record<string, string> = {
            twitter: `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
            telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
        };
        if (links[platform]) window.open(links[platform], "_blank", "width=600,height=400");
    }, [getShareUrl, t.shareTitle]);

    // ——— QR Code Generator (canvas-based, no library) ———
    const generateQr = useCallback(async () => {
        const url = getShareUrl();
        const canvas = qrCanvasRef.current;
        if (!canvas) return;
        try {
            // Dynamic import of qr generation
            const QR_API = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&bgcolor=1a1a2e&color=f472b6`;
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = QR_API;
            await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; });
            canvas.width = 340;
            canvas.height = 380;
            const ctx = canvas.getContext("2d")!;
            // Background
            ctx.fillStyle = "#1a1a2e";
            ctx.beginPath();
            ctx.roundRect(0, 0, 340, 380, 16);
            ctx.fill();
            // QR image
            ctx.drawImage(img, 20, 20, 300, 300);
            // Label
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
        a.download = "banmao_qr.png";
        a.href = canvas.toDataURL("image/png");
        a.click();
    }, []);

    // ——— Download all ———
    const downloadAllImages = useCallback((images: ImageItem[]) => {
        images.forEach((img, index) => {
            setTimeout(() => downloadImageBlob(img.src, img.name), index * 100);
        });
    }, []);

    // ——— Page navigation ———
    const goToPage = useCallback((page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 300, behavior: "smooth" });
    }, []);

    // ——— Remove Background ———
    const handleRemoveBg = useCallback(async (imgSrc: string, imgName: string) => {
        if (removingBg) return;
        setRemovingBg(true);
        cancelBgRef.current = false;
        setBgRemovedUrl(null);
        setBgRemovedName(imgName);
        try {
            console.log("[BG] Step 1: Loading library...");
            const { removeBackground } = await import("@imgly/background-removal");

            // Step 2: Get image as Blob via canvas (avoids CORS fetch issues on desktop)
            console.log("[BG] Step 2: Loading image via canvas...");
            let imageBlob: Blob;
            try {
                imageBlob = await new Promise<Blob>((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => {
                        try {
                            const canvas = document.createElement("canvas");
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            const ctx = canvas.getContext("2d");
                            if (!ctx) { reject(new Error("Canvas ctx null")); return; }
                            ctx.drawImage(img, 0, 0);
                            canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png");
                        } catch (e) { reject(e); }
                    };
                    img.onerror = () => reject(new Error("Image load failed"));
                    img.src = imgSrc;
                });
                console.log("[BG] Image loaded via canvas:", imageBlob.size, "bytes");
            } catch (canvasErr) {
                console.warn("[BG] Canvas method failed, trying fetch:", canvasErr);
                const resp = await fetch(imgSrc);
                imageBlob = await resp.blob();
                console.log("[BG] Image loaded via fetch:", imageBlob.size, "bytes");
            }

            // Step 3: Run AI background removal — try CDN first, fallback to proxy
            console.log("[BG] Step 3: Running AI removal...");
            let resultBlob: Blob | null = null;
            const bgConfig = {
                model: "isnet_quint8" as const,
                output: { format: "image/png" as const, quality: 1 },
                progress: (key: string, current: number, total: number) => {
                    console.log(`[BG] Progress: ${key} ${current}/${total}`);
                },
            };
            try {
                // Attempt 1: Use default CDN (works on mobile)
                console.log("[BG] Trying default CDN...");
                resultBlob = await removeBackground(imageBlob, bgConfig);
            } catch (cdnErr) {
                // Attempt 2: CDN failed — try local proxy (for PC where CDN is blocked)
                console.warn("[BG] CDN failed, trying local proxy...", cdnErr);
                resultBlob = await removeBackground(imageBlob, {
                    ...bgConfig,
                    publicPath: `${window.location.origin}/api/bg-model/`,
                });
            }
            if (!resultBlob) throw new Error("Background removal returned empty result");

            if (cancelBgRef.current) {
                console.log("[BG] Cancelled by user before saving.");
                return;
            }

            console.log("[BG] Step 4: Done! Result size:", resultBlob.size, "bytes");
            const url = URL.createObjectURL(resultBlob);
            await saveBgImage(imgSrc, imgName, resultBlob);

            if (cancelBgRef.current) return; // one last check before UI update

            setBgRemovedUrl(url);
            setToast(t.removeBgDone);
            setTimeout(() => setToast(null), 3000);
        } catch (err) {
            if (cancelBgRef.current) return; // ignore errors if cancelled
            console.error("[BG] FAILED:", err);
            setBgFailed(true);
            setToast("Error: " + (err instanceof Error ? err.message : String(err)));
            setTimeout(() => setToast(null), 5000);
        } finally {
            if (!cancelBgRef.current) {
                setRemovingBg(false);
            }
        }
    }, [removingBg, t.removeBgDone]);

    const handleDeleteBg = useCallback(async () => {
        if (!currentLightboxImage) return;
        try {
            await deleteBgImage(currentLightboxImage.src);
            setBgRemovedUrl(null);
            setBgRemovedName("");
            setToast(t.deleteBgConfirm);
            setTimeout(() => setToast(null), 3000);
        } catch (err) {
            console.error("Failed to delete BG:", err);
        }
    }, [currentLightboxImage, t.deleteBgConfirm]);

    const downloadBgRemoved = useCallback(async () => {
        if (!bgRemovedUrl) return;
        const fileName = bgRemovedName.replace(/\.[^.]+$/, "") + "_nobg.png";
        try {
            const res = await fetch(bgRemovedUrl);
            const blob = await res.blob();
            const file = new File([blob], fileName, { type: "image/png" });

            // Mobile/Tablet: use native Share API (save to photos/files)
            const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768;
            if (isMobile && navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: fileName });
                return;
            }

            // Desktop: programmatic download
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1000);
        } catch {
            // Final fallback: open image in new tab for manual save
            window.open(bgRemovedUrl, "_blank");
        }
    }, [bgRemovedUrl, bgRemovedName]);
    const lightboxDragStyle = dragY > 0 ? {
        transform: `translateY(${dragY}px) scale(${1 - dragY / 1000})`,
        opacity: Math.max(0.3, 1 - dragY / 400),
        transition: isDragging.current ? "none" : "all 0.3s ease",
    } : {};

    return (
        <ChatProvider>
            <>
                <div className={`collection-page ${theme === "light" ? "col-light" : ""}`} data-view={viewMode}>
                    <div className="col-bg-gradient" />

                    {/* Sticky Header */}
                    <header className={`col-header col-header-sticky ${headerHidden ? "col-header-hidden" : ""}`}>
                        <div className="col-header-left">
                            <a href="/" className="col-back-btn">{t.home}</a>
                        </div>
                        <div className="hub-view-toggle">
                            <button className={`hub-toggle-btn ${viewMode === "gallery" ? "active" : ""}`} onClick={() => setViewMode("gallery")}>🖼 {t.galleryView || 'Gallery'}</button>
                            <button className={`hub-toggle-btn ${viewMode === "hub" ? "active" : ""}`} onClick={() => setViewMode("hub")}>🐱 Hub</button>
                        </div>
                        <div className="col-header-right">
                            <div className="hub-wallet-btn">
                                <ConnectButton accountStatus="avatar" chainStatus="icon" showBalance={false} />
                            </div>
                            {isConnected && address && (
                                <>
                                    <button 
                                        className="col-pill-btn col-pill-pink hub-desktop-profile-btn" 
                                        onClick={() => { setHubProfileFilter(address); setHubFeedTab('newest'); setViewMode('hub'); }}
                                        title={t.myProfile || "My Profile"}
                                        style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}
                                    >
                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                                        {t.myProfile || "Hồ sơ"}
                                    </button>
                                    <ChatBellButton onClick={() => setShowChatInbox(true)} t={t} />
                                    <HubNotifications
                                        viewerAddress={address}
                                        onPostClick={openPostById}
                                        onProfileClick={(a) => { setHubProfileFilter(a); setHubFeedTab('newest'); }}
                                        t={t}
                                    />
                                </>
                            )}
                            <div className="col-lang-wrap">
                                <button className="col-pill-btn col-pill-pink" onClick={() => setShowLangMenu(!showLangMenu)}>
                                    {LANG_LIST.find((l) => l.code === lang)?.flag} {t.language}
                                </button>
                                {showLangMenu && (
                                    <div className="col-lang-dropdown">
                                        {LANG_LIST.map((l) => (
                                            <button
                                                key={l.code}
                                                className={`col-lang-option ${lang === l.code ? "active" : ""}`}
                                                onClick={() => handleLangChange(l.code)}
                                            >{l.flag} {l.name}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button className="col-pill-btn col-pill-pink" onClick={toggleTheme}>
                                {theme === "dark" ? "☀️" : "🌙"}
                            </button>
                        </div>
                    </header>

                    {/* Spacer for sticky header */}
                    <div className="col-header-spacer" />

                    {/* ═══════════ HUB SOCIAL FEED ═══════════ */}
                    {viewMode === "hub" && (
                        <HubFeedView
                            t={t}
                            address={address}
                            isConnected={isConnected}
                            hubPosts={hubPosts}
                            hubLoading={hubLoading}
                            hubFeedTab={hubFeedTab}
                            hubLayout={hubLayout}
                            hubProfileFilter={hubProfileFilter}
                            hubProfileTab={hubProfileTab}
                            topCreators={topCreators}
                            hubSearch={hubSearch}
                            hubBookmarks={hubBookmarks}
                            hubLikeAnim={hubLikeAnim}
                            shareMenuPostId={shareMenuPostId}
                            hubMoreOpen={hubMoreOpen}
                            carouselIndices={carouselIndices}
                            inlineCommentTexts={inlineCommentTexts}
                            inlineCommentLoading={inlineCommentLoading}
                            showEditProfile={showEditProfile}
                            profileRefreshTrigger={profileRefreshTrigger}
                            onFeedTabChange={setHubFeedTab}
                            onLayoutChange={setHubLayout}
                            onProfileFilterChange={setHubProfileFilter}
                            onProfileTabChange={(tab) => { setHubProfileTab(tab); }}
                            onHubSearchChange={setHubSearch}
                            onLike={handleLike}
                            onBookmark={handleBookmark}
                            onReport={handleReport}
                            onOpenPost={openHubPost}
                            onTip={(postId, creatorAddress, creatorName) => setShowTipModal({ postId, creatorAddress, creatorName })}
                            onShareMenuToggle={setShareMenuPostId}
                            onMoreMenuToggle={setHubMoreOpen}
                            onCarouselChange={(postId, index) => setCarouselIndices(prev => ({ ...prev, [postId]: index }))}
                            onInlineCommentChange={(postId, text) => setInlineCommentTexts(prev => ({ ...prev, [postId]: text }))}
                            onInlineCommentSubmit={handleInlineCommentSubmit}
                            onLikeListClick={fetchLikeList}
                            onShowCreatePost={() => setShowCreatePost(true)}
                            onShowEditProfile={setShowEditProfile}
                            onShowChatInbox={() => setShowChatInbox(true)}
                            onProfileUpdated={() => {
                                setProfileRefreshTrigger(prev => prev + 1);
                                if (typeof window !== 'undefined' && (window as any).toast) {
                                    (window as any).toast.success("Profile updated successfully!");
                                } else {
                                    alert("Profile updated successfully!");
                                }
                            }}
                            onHubPostsClear={() => setHubPosts([])}
                        />
                    )}
                    {/* Create Post Modal */}
                    {showCreatePost && address && (
                        <CreatePostModal
                            t={t}
                            address={address}
                            onClose={() => setShowCreatePost(false)}
                            onCreated={() => {
                                setHubPosts([]);
                                fetchHubPosts(true);
                                fetchTopCreators();
                            }}
                        />
                    )}

                    {/* Post Detail Modal */}
                    {hubDetailPost && (
                        <div className="hub-modal-overlay" onClick={() => {
                            setHubDetailPost(null);
                            const url = new URL(window.location.href);
                            url.searchParams.delete('post');
                            window.history.replaceState({}, '', url);
                        }}>
                            <div className="hub-modal hub-detail-modal" onClick={(e) => e.stopPropagation()}>
                                <button className="hub-modal-close" onClick={() => {
                                    setHubDetailPost(null);
                                    const url = new URL(window.location.href);
                                    url.searchParams.delete('post');
                                    window.history.replaceState({}, '', url);
                                }}>✕</button>
                                <div className="hub-detail-media">
                                    <div className="hub-detail-media-inner">
                                        {hubDetailPost.media_type === "video" ? (
                                            <video src={hubDetailPost.media_url} controls className="hub-detail-img" />
                                        ) : (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={hubDetailPost.media_url} alt="" className="hub-detail-img" />
                                        )}
                                    </div>
                                    <div className="hub-detail-media-tools">
                                        {/* Gallery Media Tools */}
                                        <div style={{ padding: '12px 16px 0 16px' }}>
                                            <HubMediaActions
                                                post={hubDetailPost}
                                                t={t}
                                                removingBg={removingBg}
                                                onRemoveBg={(src, name) => handleRemoveBg(src, name)}
                                                onEdit={(src) => {
                                                    setEditor({ ...DEFAULT_EDITOR });
                                                    setHubEditorOverride({
                                                        src: hubDetailPost.media_url,
                                                        name: hubDetailPost.caption || `hub_post_${hubDetailPost.id}`,
                                                        isVideo: hubDetailPost.media_type === "video",
                                                        folder: "Hub",
                                                        bytes: 0
                                                    });
                                                    setShowEditor(true);
                                                }}
                                                downloadMedia={async (src, name, isVideo) => {
                                                    incrementDownloadCount(name);
                                                    const ok = isVideo
                                                        ? await downloadImageBlob(src, name)
                                                        : await downloadWithEdits(src, name, editor);
                                                    showToast(ok ? t.downloadSuccess : t.downloadFailed, ok ? "col-toast-success" : "col-toast-error");
                                                }}
                                            />
                                        </div>

                                        {/* Standard Feed Action Bar */}
                                        <div className="hub-card-actions" style={{ padding: '12px 16px 16px 16px', marginTop: 0 }}>
                                            <div className="hub-card-actions-left">
                                                <button className={`hub-action ${hubDetailPost.liked ? 'hub-liked' : ''}`} onClick={() => handleLike(hubDetailPost.id)}>
                                                    {hubDetailPost.liked ? (
                                                        <svg viewBox="0 0 24 24" fill="currentColor" className="hub-icon hub-icon-filled"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                                                    ) : (
                                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                                                    )} <span className="hub-action-count" onClick={(e) => { e.stopPropagation(); fetchLikeList(hubDetailPost.id); }}>{hubDetailPost.like_count || 0}</span>
                                                </button>
                                                <button className="hub-action" onClick={() => {
                                                    const commentInput = document.querySelector('.hub-comment-input');
                                                    if (commentInput) (commentInput as HTMLInputElement).focus();
                                                }}>
                                                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
                                                    <span>{hubDetailPost.comment_count || 0}</span>
                                                </button>
                                                <div style={{ position: 'relative' }}>
                                                    <button className="hub-action" onClick={(e) => { e.stopPropagation(); setShareMenuPostId(shareMenuPostId === hubDetailPost.id ? null : hubDetailPost.id); }} title={t.share || 'Share'}>
                                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                                                    </button>
                                                    {shareMenuPostId === hubDetailPost.id && (
                                                        <div className="hub-share-popup" onClick={(e) => e.stopPropagation()}>
                                                            <div className="hub-share-popup-title">{t.sharePost || 'Share Post'}</div>
                                                            <button className="hub-share-option" onClick={() => { copyUrl(`${window.location.origin}/collection?post=${hubDetailPost.id}`); setShareMenuPostId(null); }}>
                                                                <span>📋</span> {t.copyLinkShare || 'Copy Link'}
                                                            </button>
                                                            <button className="hub-share-option" onClick={() => { window.open(`https://x.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/collection?post=${hubDetailPost.id}`)}&text=${encodeURIComponent(hubDetailPost.caption || 'Check out this Banmao post! 🐱')}`, '_blank'); setShareMenuPostId(null); }}>
                                                                <span>𝕏</span> {t.shareOnX || 'X'}
                                                            </button>
                                                            <button className="hub-share-option" onClick={() => { window.open(`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/collection?post=${hubDetailPost.id}`)}&text=${encodeURIComponent(hubDetailPost.caption || 'Check out this Banmao post! 🐱')}`, '_blank'); setShareMenuPostId(null); }}>
                                                                <span>✈️</span> {t.shareOnTelegram || 'Telegram'}
                                                            </button>
                                                            <button className="hub-share-option" onClick={() => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/collection?post=${hubDetailPost.id}`)}`, '_blank'); setShareMenuPostId(null); }}>
                                                                <span>📘</span> {t.shareOnFacebook || 'Facebook'}
                                                            </button>
                                                            <button className="hub-share-option" onClick={() => { window.open(`https://service.weibo.com/share/share.php?url=${encodeURIComponent(`${window.location.origin}/collection?post=${hubDetailPost.id}`)}`, '_blank'); setShareMenuPostId(null); }}>
                                                                <span>💬</span> {t.shareOnWeChat || 'WeChat'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="hub-card-actions-right">
                                                <button className={`hub-action ${hubBookmarks.has(hubDetailPost.id) ? 'hub-bookmarked' : ''}`} onClick={() => handleBookmark(hubDetailPost.id)} title="Save">
                                                    {hubBookmarks.has(hubDetailPost.id) ? (
                                                        <svg viewBox="0 0 24 24" fill="currentColor" className="hub-icon hub-icon-filled"><path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" /></svg>
                                                    ) : (
                                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                                                    )}
                                                </button>
                                                {isConnected && address?.toLowerCase() !== hubDetailPost.author_address?.toLowerCase() && (
                                                    <button className="hub-action hub-action-tip" onClick={() => setShowTipModal({
                                                        postId: hubDetailPost.id,
                                                        creatorAddress: hubDetailPost.author_address,
                                                        creatorName: hubDetailPost.username || shortAddr(hubDetailPost.author_address)
                                                    })}>
                                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                                                        {t.tip || 'Tip'}
                                                    </button>
                                                )}
                                                {isConnected && address?.toLowerCase() !== hubDetailPost.author_address?.toLowerCase() && (
                                                    <button className="hub-action hub-action-report" onClick={() => handleReport(hubDetailPost.id)} title={t.reportPost || 'Report Post'}>
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
                                            <div className="hub-avatar">{(hubDetailPost.username || "?")[0].toUpperCase()}</div>
                                            <span className="hub-post-name">{hubDetailPost.username || shortAddr(hubDetailPost.author_address)}</span>
                                        </div>
                                    </div>
                                    {hubDetailPost.caption && <div className="hub-post-caption" style={{ padding: '0 16px 12px 16px' }}>{hubDetailPost.caption}</div>}



                                    <CommentSection t={t} postId={hubDetailPost.id} address={address} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tip Modal */}
                    {showTipModal && address && (
                        <TipModal t={t} postId={showTipModal.postId} creatorAddress={showTipModal.creatorAddress} creatorName={showTipModal.creatorName} tipperAddress={address} onClose={() => setShowTipModal(null)} onSuccess={() => fetchHubPosts(true)} />
                    )}

                    {/* Like List Popup */}
                    {showLikeList !== null && (
                        <div className="hub-modal-overlay" onClick={() => setShowLikeList(null)}>
                            <div className="hub-modal hub-like-list-modal" onClick={(e) => e.stopPropagation()}>
                                <button className="hub-modal-close" onClick={() => setShowLikeList(null)}>✕</button>
                                <div className="hub-like-list-header">
                                    <h3 className="hub-like-list-title">❤️ {t.likes || 'Likes'}</h3>
                                    <span className="hub-like-list-count">{likeListData.length}</span>
                                </div>
                                <div className="hub-like-list">
                                    {likeListData.length === 0 ? (
                                        <div className="hub-like-list-empty">
                                            <span style={{ fontSize: 32 }}>💔</span>
                                            <p>{t.noLikesYet || 'No likes yet'}</p>
                                        </div>
                                    ) : likeListData.map((liker: any, i: number) => (
                                        <button
                                            key={i}
                                            className="hub-like-list-item"
                                            onClick={() => {
                                                setShowLikeList(null);
                                                setHubDetailPost(null);
                                                setHubProfileFilter(liker.liker_address);
                                            }}
                                        >
                                            <div className="hub-like-list-avatar">
                                                {liker.avatar_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={liker.avatar_url} alt="" />
                                                ) : (
                                                    (liker.username || '?')[0].toUpperCase()
                                                )}
                                            </div>
                                            <div className="hub-like-list-info">
                                                <span className="hub-like-list-name">{liker.username || shortAddr(liker.liker_address)}</span>
                                                <span className="hub-like-list-addr">{shortAddr(liker.liker_address)}</span>
                                            </div>
                                            <span className="hub-like-list-view">{t.profile || 'Profile'} →</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══════════ GALLERY VIEW ═══════════ */}
                    {/* Hero Banner */}
                    {!loading && (
                        <div className="col-hero">
                            <div className="col-hero-bg" />
                            <div className="col-hero-content">
                                <h2 className="col-hero-title">🐱 {t.title} 🍌</h2>
                                <p className="col-hero-tagline">{t.heroTagline}</p>
                                <div className="col-hero-stats">
                                    <div className="col-hero-stat">
                                        <span className="col-hero-stat-value">{allImages.filter(i => !i.isVideo).length}</span>
                                        <span className="col-hero-stat-label">🖼️ {t.filterImages}</span>
                                    </div>
                                    <div className="col-hero-stat">
                                        <span className="col-hero-stat-value">{allImages.filter(i => i.isVideo).length}</span>
                                        <span className="col-hero-stat-label">🎬 {t.filterVideos}</span>
                                    </div>
                                    <div className="col-hero-stat">
                                        <span className="col-hero-stat-value">{folders.length}</span>
                                        <span className="col-hero-stat-label">📁 {t.stats_folders}</span>
                                    </div>
                                    <div className="col-hero-stat">
                                        <span className="col-hero-stat-value">{formatBytes(totalBytes)}</span>
                                        <span className="col-hero-stat-label">💾 {t.stats_size}</span>
                                    </div>
                                </div>
                                <div className="col-hero-actions">
                                    {deferredPrompt && (
                                        <button className="col-hero-action-btn col-hero-install" onClick={installPwa}>
                                            📲 {t.installApp}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Search */}
                    <section className="col-section">
                        <div className="col-search-wrap">
                            <span className="col-search-icon">🔍</span>
                            <input
                                type="text"
                                data-banmao-ai-id="collection.search"
                                data-banmao-ai-label="Search Banmao collection"
                                data-banmao-ai-action="fill"
                                data-banmao-ai-risk="reversible"
                                className="col-search-input"
                                placeholder={t.search}
                                value={searchQuery}
                                onChange={handleSearch}
                            />
                        </div>

                        {/* Filter Bar */}
                        <div className="col-filter-bar">
                            <div className="col-type-filters">
                                {(["all", "images", "videos"] as const).map(type => (
                                    <button
                                        key={type}
                                        data-banmao-ai-id={`collection.filter.${type}`}
                                        data-banmao-ai-label={`Filter collection by ${type}`}
                                        data-banmao-ai-action="activate"
                                        data-banmao-ai-risk="reversible"
                                        className={`col-type-btn ${typeFilter === type ? "active" : ""}`}
                                        onClick={() => { setTypeFilter(type); setCurrentPage(1); }}
                                    >
                                        {type === "all" ? `📋 ${t.filterAll}` : type === "images" ? `🖼️ ${t.filterImages}` : `🎬 ${t.filterVideos}`}
                                    </button>
                                ))}
                            </div>
                            <div className="col-sort-dropdown">
                                <button
                                    ref={sortTriggerRef}
                                    className="col-sort-trigger"
                                    onClick={() => setShowSortMenu(!showSortMenu)}
                                >
                                    {sortBy === "random" ? `🎲 ${t.sortRandom}` : sortBy === "name" ? `↕ ${t.sortName}` : sortBy === "newest" ? `🕐 ${t.sortNewest}` : `📦 ${t.sortSize}`}
                                    <span className="col-sort-arrow">{showSortMenu ? "▲" : "▼"}</span>
                                </button>
                            </div>
                            <button className="col-sort-trigger" onClick={() => setShowStats(true)} title="Statistics">
                                📊
                            </button>
                        </div>

                    </section>

                    {/* Folder Tabs — collapsible on mobile */}
                    <section className="col-section">
                        <button className="col-tabs-toggle" onClick={() => setShowTabsMenu(!showTabsMenu)}>
                            <span>{activeTab === "all" ? "📂 All" : activeTab === "favorites" ? "❤️ Favorites" : `${folderIcon(activeTab)} ${folderLabelTranslated(activeTab, lang)}`}</span>
                            <span className="col-tabs-toggle-arrow">{showTabsMenu ? "▲" : "▼"}</span>
                        </button>
                        {showTabsMenu && (
                            <div className="col-tabs">
                                <button className={`col-tab ${activeTab === "all" ? "active" : ""}`} onClick={() => handleTabChange("all")}>
                                    📂 All <span className="col-tab-count">{allImages.length}</span>
                                </button>
                                <button className={`col-tab ${activeTab === "favorites" ? "active" : ""}`} onClick={() => handleTabChange("favorites")}>
                                    ❤️ <span className="col-tab-count">{favorites.size}</span>
                                </button>
                                {folders.map((f) => (
                                    <button
                                        key={f}
                                        className={`col-tab ${activeTab === f ? "active" : ""}`}
                                        onClick={() => handleTabChange(f)}
                                    >
                                        {folderIcon(f)} {folderLabelTranslated(f, lang)}
                                        <span className="col-tab-count">{allImages.filter((i) => i.folder === f).length}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Image Grid */}
                    <section className="col-section">
                        <div className="col-section-header">
                            <div>
                                <h2 className="col-section-title">
                                    {activeTab === "all" ? "📂 All" : activeTab === "favorites" ? "❤️ Favorites" : `${folderIcon(activeTab)} ${folderLabelTranslated(activeTab, lang)}`}
                                    {" "}<span style={{ fontSize: "13px", opacity: 0.5 }}>({filteredImages.length})</span>
                                </h2>
                                {totalPages > 1 && (
                                    <p className="col-section-desc">{t.page} {currentPage} / {totalPages}</p>
                                )}
                            </div>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                {activeTab === "favorites" && (
                                    <button
                                        className="col-layout-toggle"
                                        onClick={handleShareFavorites}
                                        title="Share these favorites"
                                        style={{ background: "rgba(244, 114, 182, 0.1)", color: "#f472b6" }}
                                    >
                                        📤
                                    </button>
                                )}
                                <button
                                    className={`col-layout-toggle ${isInfinite ? "active" : ""}`}
                                    onClick={() => { setIsInfinite(!isInfinite); setCurrentPage(1); }}
                                    title={isInfinite ? "Disable Infinite Scroll" : "Enable Infinite Scroll"}
                                    style={{ fontSize: "14px" }}
                                >
                                    ♾️
                                </button>
                                <div className="col-grid-selector">
                                    {[3, 5, 7, 9, 11].map(n => (
                                        <button
                                            key={n}
                                            className={`col-grid-btn ${gridCols === n ? "active" : ""}`}
                                            onClick={() => setGridCols(n)}
                                            title={`${n} columns`}
                                        >
                                            <span className="col-grid-icon" style={{
                                                display: "grid",
                                                gridTemplateColumns: `repeat(${n}, 1fr)`,
                                                gap: "1px",
                                                width: "14px", height: "14px"
                                            }}>
                                                {Array.from({ length: n * 2 }).map((_, i) => (
                                                    <span key={i} style={{ background: "currentColor", borderRadius: "1px", opacity: 0.7 }} />
                                                ))}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="col-grid" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
                                {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : displayImages.length > 0 ? (
                            <>
                                <div className="col-grid" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
                                    {displayImages.map((img) => (
                                        <ImageCard
                                            key={collectionItemKey(img)}
                                            img={img}
                                            t={t}
                                            lang={lang}
                                            onOpen={openLightbox}
                                            isFav={favorites.has(img.src)}
                                            onFav={toggleFav}
                                            dlCount={downloadCounts[img.name] || 0}
                                            onDl={() => incrementDownloadCount(img.name)}
                                            onDownloadToast={handleDownloadToast}
                                            draggable={activeTab === "favorites" && sortBy === "name"}
                                            onDragStart={(e) => handleDragStartItem(e, img.src)}
                                            onDragOver={handleDragOverItem}
                                            onDrop={(e) => handleDropItem(e, img.src)}
                                        />
                                    ))}
                                </div>

                                {/* Background loading progress */}
                                {loadProgress && loadProgress.loaded < loadProgress.total && (
                                    <div className="col-load-progress" style={{
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        gap: "10px", padding: "12px 0", opacity: 0.7, fontSize: "13px",
                                        color: "var(--col-text-secondary, #aaa)",
                                    }}>
                                        <div className="col-infinite-spinner" style={{ width: "16px", height: "16px" }} />
                                        <span>
                                            {t.loading} {loadProgress.loaded} / {loadProgress.total}
                                        </span>
                                        <div style={{
                                            width: "120px", height: "4px", borderRadius: "2px",
                                            background: "rgba(255,255,255,0.1)", overflow: "hidden",
                                        }}>
                                            <div style={{
                                                width: `${Math.round((loadProgress.loaded / loadProgress.total) * 100)}%`,
                                                height: "100%", borderRadius: "2px",
                                                background: "linear-gradient(90deg, #22d3ee, #a78bfa)",
                                                transition: "width 0.3s ease",
                                            }} />
                                        </div>
                                    </div>
                                )}

                                {/* Infinite Scroll Sentinel OR Pagination */}
                                {isInfinite ? (
                                    currentPage < totalPages && (
                                        <div ref={loadMoreRef} className="col-infinite-sentinel" style={{ height: "40px", width: "100%", display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
                                            <div className="col-infinite-spinner" />
                                        </div>
                                    )
                                ) : (
                                    totalPages > 1 && (
                                        <div className="col-pagination">
                                            <button
                                                className="col-page-btn col-page-arrow"
                                                disabled={currentPage === 1}
                                                onClick={() => { setCurrentPage(Math.max(1, currentPage - 1)); window.scrollTo({ top: 400, behavior: "smooth" }); }}
                                            >
                                                ‹
                                            </button>
                                            {(() => {
                                                const pages: (number | string)[] = [];
                                                const maxVisible = 5;
                                                if (totalPages <= maxVisible + 2) {
                                                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                                                } else {
                                                    pages.push(1);
                                                    if (currentPage > 3) pages.push("...");
                                                    const start = Math.max(2, currentPage - 1);
                                                    const end = Math.min(totalPages - 1, currentPage + 1);
                                                    for (let i = start; i <= end; i++) pages.push(i);
                                                    if (currentPage < totalPages - 2) pages.push("...");
                                                    pages.push(totalPages);
                                                }
                                                return pages.map((p, idx) =>
                                                    typeof p === "string" ? (
                                                        <span key={`dot-${idx}`} className="col-page-dots">⋯</span>
                                                    ) : (
                                                        <button
                                                            key={p}
                                                            className={`col-page-btn ${currentPage === p ? "active" : ""}`}
                                                            onClick={() => { setCurrentPage(p); window.scrollTo({ top: 400, behavior: "smooth" }); }}
                                                        >
                                                            {p}
                                                        </button>
                                                    )
                                                );
                                            })()}
                                            <button
                                                className="col-page-btn col-page-arrow"
                                                disabled={currentPage === totalPages}
                                                onClick={() => { setCurrentPage(Math.min(totalPages, currentPage + 1)); window.scrollTo({ top: 400, behavior: "smooth" }); }}
                                            >
                                                ›
                                            </button>
                                        </div>
                                    )
                                )}
                            </>
                        ) : (
                            <p className="col-empty">{t.noImages}</p>
                        )}
                    </section>

                    {/* Lightbox */}
                    {currentLightboxImage && (
                        <div
                            className="col-lightbox"
                            onClick={closeLightbox}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            {/* Side zones */}
                            {lightboxIndex !== null && lightboxIndex > 0 && (
                                <div className="col-lightbox-zone col-lightbox-zone-left" onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}>
                                    <span className="col-lightbox-zone-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                                    </span>
                                </div>
                            )}
                            {lightboxIndex !== null && lightboxIndex < filteredImages.length - 1 && (
                                <div className="col-lightbox-zone col-lightbox-zone-right" onClick={(e) => { e.stopPropagation(); lightboxNext(); }}>
                                    <span className="col-lightbox-zone-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                                    </span>
                                </div>
                            )}

                            {/* Nút đóng ảnh */}
                            <button className="col-lightbox-close" onClick={closeLightbox}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                            </button>

                            {/* Slideshow Toggle */}
                            <button
                                className={`col-lightbox-slideshow ${isSlideshow ? "col-lightbox-slideshow-active" : ""}`}
                                onClick={(e) => { e.stopPropagation(); setIsSlideshow(!isSlideshow); }}
                            >
                                {isSlideshow ? "⏸ Pause" : "▶ Play"}
                            </button>

                            <div className="col-lightbox-inner" onClick={(e) => e.stopPropagation()} style={lightboxDragStyle}>
                                <div
                                    className="col-lightbox-img-wrap"
                                    onTouchStart={handleLightboxTouchStart}
                                    onTouchMove={handleLightboxTouchMove}
                                    onTouchEnd={handleLightboxTouchEnd}
                                    style={{ touchAction: zoomScale > 1 ? "none" : "auto" }}
                                >
                                    {imgLoading && <div className="col-lightbox-loader"><div className="col-infinite-spinner" /></div>}
                                    {currentLightboxImage.isVideo ? (
                                        <video
                                            src={currentLightboxImage.src}
                                            controls
                                            autoPlay
                                            className="col-lightbox-video"
                                            onLoadedData={() => setImgLoading(false)}
                                        />
                                    ) : (
                                        <img
                                            src={currentLightboxImage.src}
                                            alt={currentLightboxImage.name}
                                            crossOrigin="anonymous"
                                            className={`col-lightbox-img ${imgLoading ? "col-img-loading" : ""}`}
                                            onLoad={() => setImgLoading(false)}
                                            style={{
                                                filter: showOriginal ? "none" : editorFilterCSS(editor),
                                                transform: `${showOriginal ? "" : editorTransformCSS(editor)} scale(${zoomScale}) translate(${zoomOffset.x / zoomScale}px, ${zoomOffset.y / zoomScale}px)`,
                                                transition: zoomScale === 1 ? "transform 0.3s ease" : "none",
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Bottom sheet */}
                                <div className="col-lightbox-sheet">
                                    <div className="col-sheet-handle" />

                                    {/* Mobile-only navigation row */}
                                    <div className="col-mobile-nav">
                                        <button className="col-mobile-nav-btn" disabled={lightboxIndex === 0}
                                            onClick={() => lightboxPrev()}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                                        </button>
                                        <span className="col-mobile-nav-label">
                                            {(lightboxIndex ?? 0) + 1} / {filteredImages.length}
                                        </span>
                                        <button className="col-mobile-nav-btn" disabled={lightboxIndex === filteredImages.length - 1}
                                            onClick={() => lightboxNext()}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                                        </button>
                                    </div>

                                    <p className="col-lightbox-name">{currentLightboxImage.isVideo ? `🎬 ${lang !== "en" ? translateName(currentLightboxImage.name, lang as "vi" | "zh" | "ko" | "ru" | "id") : currentLightboxImage.name}` : (lang !== "en" ? translateName(currentLightboxImage.name, lang as "vi" | "zh" | "ko" | "ru" | "id") : currentLightboxImage.name)}</p>
                                    <span className="col-lightbox-info">
                                        {folderLabelTranslated(currentLightboxImage.folder, lang)} · {formatBytes(currentLightboxImage.bytes)}
                                        {currentLightboxImage.isVideo && currentLightboxImage.duration ? ` · ${formatDuration(currentLightboxImage.duration)}` : ""}
                                        {currentLightboxImage.width && currentLightboxImage.height ? ` · ${currentLightboxImage.width}×${currentLightboxImage.height}` : ""}
                                    </span>
                                    {/* Tags */}
                                    {currentLightboxImage.tags && currentLightboxImage.tags.length > 0 && (
                                        <div className="col-lightbox-tags">
                                            {currentLightboxImage.tags.map((tag) => (
                                                <span key={tag} className="col-lightbox-tag" onClick={() => {
                                                    setSearchQuery(tag);
                                                    closeLightbox();
                                                }} title={`Search: ${tag}`}>#{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                    {/* Context caption/description */}
                                    {currentLightboxImage.context && (currentLightboxImage.context.caption || currentLightboxImage.context.alt) && (
                                        <p className="col-lightbox-context">
                                            {currentLightboxImage.context.caption || currentLightboxImage.context.alt}
                                        </p>
                                    )}

                                    {/* Action buttons */}
                                    <div className="col-sheet-actions">
                                        <button className={`col-pill-btn col-pill-download ${lbDownloading}`} onClick={async () => {
                                            if (lbDownloading === "downloading") return;
                                            setLbDownloading("downloading");
                                            incrementDownloadCount(currentLightboxImage.name);
                                            const ok = currentLightboxImage.isVideo
                                                ? await downloadImageBlob(currentLightboxImage.src, currentLightboxImage.name)
                                                : await downloadWithEdits(currentLightboxImage.src, currentLightboxImage.name, editor);
                                            setLbDownloading("dl-success");
                                            showToast(ok ? t.downloadSuccess : t.downloadFailed, ok ? "col-toast-success" : "col-toast-error");
                                            setTimeout(() => setLbDownloading(""), 1500);
                                        }}>
                                            {lbDownloading === "dl-success" ? "✅" : "⬇"} {t.download}
                                        </button>
                                        {!currentLightboxImage.isVideo && (
                                            <button className={`col-pill-btn col-pill-green ${removingBg ? "loading" : ""}`}
                                                disabled={removingBg}
                                                onClick={() => handleRemoveBg(currentLightboxImage.src, currentLightboxImage.name)}>
                                                {removingBg ? (
                                                    <><span className="col-remove-bg-spinner" /> {t.removingBg}</>
                                                ) : (
                                                    <>✂️ {t.removeBg}</>
                                                )}
                                            </button>
                                        )}
                                        <button className={`col-pill-btn col-pill-pink ${showSharePanel ? "col-fav-active" : ""}`}
                                            onClick={() => { setShowSharePanel(!showSharePanel); setShowQr(false); }}>
                                            📤 {t.share}
                                        </button>
                                        <button className={`col-pill-btn col-pill-pink ${showQr ? "col-fav-active" : ""}`}
                                            onClick={() => { if (!showQr) generateQr(); else setShowQr(false); setShowSharePanel(false); }}>
                                            📱 {t.qrCode}
                                        </button>
                                        <button className={`col-pill-btn col-pill-pink ${favorites.has(currentLightboxImage.src) ? "col-fav-active" : ""}`}
                                            onClick={() => toggleFav(currentLightboxImage.src)}>
                                            {favorites.has(currentLightboxImage.src) ? "❤️" : "🤍"}
                                        </button>
                                        {!currentLightboxImage.isVideo && (
                                            <button className={`col-pill-btn col-pill-pink ${showEditor ? "col-fav-active" : ""}`}
                                                onClick={() => setShowEditor(!showEditor)}>
                                                🎨 {t.edit}
                                            </button>
                                        )}
                                        {/* Prompt button - only show if there's valid prompt data for this folder */}
                                        <button className={`col-pill-btn col-pill-pink ${showPromptPanel ? "col-fav-active" : ""}`}
                                            onClick={() => setShowPromptPanel(!showPromptPanel)}>
                                            ✨ {t.viewPrompt || "Prompt"}
                                        </button>
                                    </div>

                                    {/* AI Prompt Panel */}
                                    {showPromptPanel && (
                                        <div className="col-prompt-panel">
                                            <div className="col-share-title">✨ {t.promptTitle}</div>
                                            {promptLoading ? (
                                                <div className="col-prompt-loading"><span className="col-infinite-spinner" style={{width: 16, height: 16}}/> {t.promptLoading}</div>
                                            ) : currentPrompt ? (
                                                <>
                                                    <div className="col-prompt-text">{currentPrompt.prompt}</div>
                                                    <div className="col-prompt-actions">
                                                        <button className="col-pill-btn col-pill-green col-prompt-action"
                                                            onClick={async () => {
                                                                await navigator.clipboard.writeText(currentPrompt.prompt);
                                                                setToast(t.promptCopied);
                                                                setTimeout(() => setToast(null), 2500);
                                                            }}>
                                                            📋 {t.copyPrompt}
                                                        </button>
                                                        {currentShareLink && (
                                                            <a href={currentShareLink} target="_blank" rel="noopener noreferrer" className="col-pill-btn col-pill-pink col-prompt-action" style={{textDecoration: 'none'}}>
                                                                🚀 {t.openShareLink}
                                                            </a>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="col-prompt-empty">
                                                    {t.promptEmpty}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Share Panel */}
                                    {showSharePanel && (
                                        <div className="col-share-panel">
                                            <div className="col-share-title">{t.shareOn}</div>
                                            <div className="col-share-buttons">
                                                <button className="col-share-btn col-share-twitter" onClick={() => shareToSocial("twitter")}>
                                                    𝕏 Twitter
                                                </button>
                                                <button className="col-share-btn col-share-telegram" onClick={() => shareToSocial("telegram")}>
                                                    ✈️ Telegram
                                                </button>
                                                <button className="col-share-btn col-share-facebook" onClick={() => shareToSocial("facebook")}>
                                                    📘 Facebook
                                                </button>
                                                <button className="col-share-btn col-share-whatsapp" onClick={() => shareToSocial("whatsapp")}>
                                                    💬 WhatsApp
                                                </button>
                                                <button className="col-share-btn col-share-copy" onClick={() => copyUrl(getShareUrl())}>
                                                    🔗 {t.copyLink}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* QR Code Panel */}
                                    <canvas ref={qrCanvasRef} style={{ display: "none" }} />
                                    {showQr && (
                                        <div className="col-qr-panel">
                                            <div className="col-qr-title">{t.qrCode}</div>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={qrCanvasRef.current?.toDataURL()} alt="QR Code" className="col-qr-img" />
                                            <button className="col-pill-btn col-pill-pink" onClick={downloadQr}>
                                                {t.downloadQr}
                                            </button>
                                        </div>
                                    )}

                                    {/* BG Removal status/result — always visible */}
                                    {removingBg && (
                                        <div className="col-bg-status col-bg-processing-box" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className="col-remove-bg-spinner" />
                                                <div className="col-bg-status-text">
                                                    <strong>{t.removeBgProcessing}{bgRemovedName}</strong>
                                                    <span>{t.removeBgWait}</span>
                                                </div>
                                            </div>
                                            <button
                                                className="col-pill-btn col-pill-pink"
                                                style={{ padding: '6px 16px', fontSize: '12px', alignSelf: 'center' }}
                                                onClick={() => {
                                                    cancelBgRef.current = true;
                                                    setRemovingBg(false);
                                                }}
                                            >
                                                🛑 {(t as any).cancelBg || "Cancel"}
                                            </button>
                                        </div>
                                    )}

                                    {bgRemovedUrl && !removingBg && (
                                        <div className="col-bg-result">
                                            <div className="col-bg-result-title">✅ {t.removeBgResult} ({t.savedBg})</div>
                                            <div className="col-bg-result-preview">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={bgRemovedUrl} alt="No background" className="col-bg-result-img" />
                                            </div>
                                            <div className="col-bg-result-actions" style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                <button className="col-pill-btn col-pill-green col-bg-action-btn" onClick={downloadBgRemoved}>
                                                    ⬇ {t.removeBgDownload}
                                                </button>
                                                <button className="col-pill-btn col-pill-pink col-bg-action-btn col-bg-delete-btn" onClick={handleDeleteBg}>
                                                    🗑️ {t.deleteBg}
                                                </button>
                                            </div>
                                            <div className="col-bg-photoroom-note">
                                                💡 {t.photoroomNote} <a href="https://www.photoroom.com/" target="_blank" rel="noopener noreferrer" className="col-photoroom-link">PhotoRoom.com →</a>
                                            </div>
                                        </div>
                                    )}

                                    {/* BG Removal Failed */}
                                    {bgFailed && !removingBg && !bgRemovedUrl && (
                                        <div className="col-bg-failed">
                                            <div className="col-bg-failed-icon">❌</div>
                                            <div className="col-bg-failed-text">{t.bgFailedText}</div>
                                            <a href="https://www.photoroom.com/" target="_blank" rel="noopener noreferrer" className="col-pill-btn col-pill-green col-bg-action-btn">
                                                🌐 {t.bgFailedLink}
                                            </a>
                                            <button className="col-pill-btn col-pill-pink col-bg-action-btn" onClick={() => setBgFailed(false)}>
                                                🔄 {t.bgFailedRetry}
                                            </button>
                                        </div>
                                    )}

                                    {/* Telegram Custom Sticker Form (only shows when BG is removed) */}
                                    {bgRemovedUrl && !removingBg && (
                                        <div className="col-tele-panel">
                                            <div className="col-tele-header">
                                                <div className="col-tele-title">✈️ {t.teleTitle}</div>
                                                <button className="col-tele-guide-btn" onClick={() => setShowTeleGuide(true)}>
                                                    ℹ️
                                                </button>
                                            </div>
                                            <div className="col-tele-sub">{t.teleSub}</div>
                                            <div className="col-tele-form">
                                                <input
                                                    type="text"
                                                    className="col-tele-input"
                                                    placeholder={t.telePlaceholder}
                                                    value={teleLinkName}
                                                    onChange={(e) => setTeleLinkName(e.target.value)}
                                                />
                                                <a
                                                    href={`https://t.me/addstickers/${teleLinkName || "banmao_stickers"}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="col-tele-btn"
                                                >
                                                    {t.teleBtn}
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {/* Editor Panel */}
                                    {showEditor && (
                                        <div className="col-editor-panel">
                                            {/* Mobile tab bar */}
                                            <div className="col-editor-tabbar">
                                                <button className={`col-editor-tab ${editorTab === 0 ? "active" : ""}`} onClick={() => setEditorTab(0)}>🎨 {t.presets}</button>
                                                <button className={`col-editor-tab ${editorTab === 1 ? "active" : ""}`} onClick={() => setEditorTab(1)}>⚙️ {t.brightness.split(' ')[0]}</button>
                                                <button className={`col-editor-tab ${editorTab === 2 ? "active" : ""}`} onClick={() => setEditorTab(2)}>🔧 {t.rotate.split(' ')[0]}</button>
                                            </div>

                                            {/* Tab 0: Presets + Before/After */}
                                            <div className={`col-editor-tab-content ${editorTab === 0 ? "active" : ""}`} data-tab="0">
                                                <div className="col-editor-presets">
                                                    {EDITOR_PRESETS.map((p) => (
                                                        <button key={p.key} className="col-preset-btn"
                                                            onClick={() => setEditor({ ...DEFAULT_EDITOR, ...p.values, rotate: editor.rotate, flipH: editor.flipH, flipV: editor.flipV, format: editor.format })}>
                                                            <span className="col-preset-emoji">{p.emoji}</span>
                                                            <span className="col-preset-name">{t[p.key]}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="col-editor-actions">
                                                    <button className="col-editor-btn col-before-after"
                                                        onMouseDown={() => setShowOriginal(true)}
                                                        onMouseUp={() => setShowOriginal(false)}
                                                        onMouseLeave={() => setShowOriginal(false)}
                                                        onTouchStart={(e) => { e.stopPropagation(); setShowOriginal(true); }}
                                                        onTouchEnd={() => setShowOriginal(false)}>
                                                        👁 {t.beforeAfter}
                                                    </button>
                                                    <button className="col-pill-btn col-pill-pink-border"
                                                        onClick={() => setEditor({ ...DEFAULT_EDITOR, format: editor.format })}>
                                                        {t.reset}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Tab 1: Adjustments (Sliders) */}
                                            <div className={`col-editor-tab-content ${editorTab === 1 ? "active" : ""}`} data-tab="1">
                                                <div className="col-editor-sliders">
                                                    <div className="col-editor-group">
                                                        <label className="col-editor-label">☀️ {t.brightness} <span>{editor.brightness}%</span></label>
                                                        <input type="range" min="0" max="200" value={editor.brightness}
                                                            onChange={(e) => setEditor({ ...editor, brightness: +e.target.value })}
                                                            onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} />
                                                    </div>
                                                    <div className="col-editor-group">
                                                        <label className="col-editor-label">🌓 {t.contrast} <span>{editor.contrast}%</span></label>
                                                        <input type="range" min="0" max="200" value={editor.contrast}
                                                            onChange={(e) => setEditor({ ...editor, contrast: +e.target.value })}
                                                            onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} />
                                                    </div>
                                                    <div className="col-editor-group">
                                                        <label className="col-editor-label">🌈 {t.saturate} <span>{editor.saturate}%</span></label>
                                                        <input type="range" min="0" max="200" value={editor.saturate}
                                                            onChange={(e) => setEditor({ ...editor, saturate: +e.target.value })}
                                                            onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} />
                                                    </div>
                                                    <div className="col-editor-group">
                                                        <label className="col-editor-label">🎨 {t.hueRotate} <span>{editor.hueRotate}°</span></label>
                                                        <input type="range" min="0" max="360" value={editor.hueRotate}
                                                            onChange={(e) => setEditor({ ...editor, hueRotate: +e.target.value })}
                                                            onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} />
                                                    </div>
                                                    <div className="col-editor-group">
                                                        <label className="col-editor-label">💧 {t.blur} <span>{editor.blur}px</span></label>
                                                        <input type="range" min="0" max="20" value={editor.blur}
                                                            onChange={(e) => setEditor({ ...editor, blur: +e.target.value })}
                                                            onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} />
                                                    </div>
                                                    <div className="col-editor-group">
                                                        <label className="col-editor-label">⬛ {t.grayscale} <span>{editor.grayscale}%</span></label>
                                                        <input type="range" min="0" max="100" value={editor.grayscale}
                                                            onChange={(e) => setEditor({ ...editor, grayscale: +e.target.value })}
                                                            onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tab 2: Transform + Format + Actions */}
                                            <div className={`col-editor-tab-content ${editorTab === 2 ? "active" : ""}`} data-tab="2">
                                                <div className="col-editor-row">
                                                    <button className="col-editor-btn" onClick={() => setEditor({ ...editor, rotate: (editor.rotate + 90) % 360 })}>🔄 {t.rotate} {editor.rotate}°</button>
                                                    <button className={`col-editor-btn ${editor.flipH ? "active" : ""}`} onClick={() => setEditor({ ...editor, flipH: !editor.flipH })}>↔ {t.flipH}</button>
                                                    <button className={`col-editor-btn ${editor.flipV ? "active" : ""}`} onClick={() => setEditor({ ...editor, flipV: !editor.flipV })}>↕ {t.flipV}</button>
                                                </div>
                                                <div className="col-editor-row">
                                                    {(["png", "jpeg", "webp"] as ImageFormat[]).map((f) => (
                                                        <button key={f} className={`col-editor-btn ${editor.format === f ? "active" : ""}`}
                                                            onClick={() => setEditor({ ...editor, format: f })}>
                                                            {f.toUpperCase()}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="col-editor-actions">
                                                    <button className="col-pill-btn col-pill-pink"
                                                        onClick={() => downloadWithEdits(currentLightboxImage.src, currentLightboxImage.name, editor)}>
                                                        ⬇ {t.downloadEdited}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Telegram Guide Modal */}
                                    {showTeleGuide && (
                                        <div className="col-tele-modal-overlay" onClick={() => setShowTeleGuide(false)}>
                                            <div className="col-tele-modal" onClick={(e) => e.stopPropagation()}>
                                                <div className="col-tele-modal-header">
                                                    <h3>{t.teleGuideTitle}</h3>
                                                    <button className="col-tele-close" onClick={() => setShowTeleGuide(false)}>✕</button>
                                                </div>
                                                <div className="col-tele-modal-body">
                                                    <p>{t.teleStep1}</p>
                                                    <p>{t.teleStep2}</p>
                                                    <p>{t.teleStep3}</p>
                                                    <p>{t.teleStep4}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scroll to top FAB */}
                    {showScrollTop && (
                        <button className="col-fab" onClick={scrollToTop} title="Scroll to top">↑</button>
                    )}

                    {/* Toast */}
                    {toast && <div className={`col-toast ${toastType}`}>{toast}</div>}

                    {/* Footer */}
                    <footer className="col-footer">
                        <div className="col-footer-content">
                            <div className="col-footer-socials">
                                <a href="https://t.me/banmao_x" target="_blank" rel="noopener noreferrer" className="col-social-btn col-telegram" title="Telegram">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.98 1.26-5.59 3.7-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.41-1.43-.87.03-.23.36-.47 1-.72 3.92-1.7 6.54-2.83 7.84-3.37 3.73-1.55 4.51-1.82 5.01-1.83.11 0 .36.03.49.13.11.09.14.22.15.34-.01.07-.01.22-.03.34z" />
                                    </svg>
                                </a>
                                <a href="https://x.com/banmao_x" target="_blank" rel="noopener noreferrer" className="col-social-btn col-x" title="X (Twitter)">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                </a>
                            </div>
                            <div className="col-footer-text">
                                <p>Developed by <strong>ＤＯＲＥＭＯＮ</strong></p>
                                <p className="col-footer-copy">© 2026 banmao🐱🍌</p>
                            </div>
                        </div>
                    </footer>
                </div>


                {/* Sort menu overlay — rendered at root to escape stacking contexts */}
                {
                    showSortMenu && (() => {
                        const rect = sortTriggerRef.current?.getBoundingClientRect();
                        const menuTop = rect ? rect.bottom + 6 : 100;
                        const menuRight = rect ? window.innerWidth - rect.right : 20;
                        return (
                            <div className={theme === "light" ? "col-light" : ""}>
                                <div className="col-sort-backdrop" onClick={() => setShowSortMenu(false)} />
                                <div
                                    className="col-sort-menu col-sort-menu-portal"
                                    style={{ position: "fixed", top: menuTop, right: menuRight, left: "auto" }}
                                >
                                    {(["random", "name", "newest", "size"] as const).map(s => (
                                        <button
                                            key={s}
                                            className={`col-sort-option ${sortBy === s ? "active" : ""}`}
                                            onClick={(e) => { e.stopPropagation(); if (s === "random") randomSeedRef.current = Math.floor(Math.random() * 0x7fffffff); setSortBy(s); setCurrentPage(1); setShowSortMenu(false); }}
                                        >
                                            {s === "random" ? `🎲 ${t.sortRandom}` : s === "name" ? `↕ ${t.sortName}` : s === "newest" ? `🕐 ${t.sortNewest}` : `📦 ${t.sortSize}`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })()
                }

                {/* Push Protocol Messenger Widget */}
                <div className={theme === "light" ? "col-light" : ""}>
                    <ChatWidget
                        isOpen={showChatInbox}
                        onClose={() => setShowChatInbox(false)}
                        t={t}
                    />
                    {showStats && (
                        <CollectionStats
                            images={allImages}
                            downloadCounts={downloadCounts}
                            onClose={() => setShowStats(false)}
                            t={t}
                            lang={lang}
                            onDownload={incrementDownloadCount}
                        />
                    )}
                </div>
            </>
        </ChatProvider>
    );
}
