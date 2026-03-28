"use client";
import { create } from "zustand";
import type { Lang } from "../i18n";

/* ===================== SHARED TYPES ===================== */

export interface ImageItem {
    src: string;
    thumb: string;
    thumbSm: string;
    name: string;
    folder: string;
    bytes: number;
    type: "sticker" | "background";
    isVideo: boolean;
    duration?: number;
    width?: number;
    height?: number;
}



export type ImageFormat = "png" | "jpeg" | "webp";

export interface EditorState {
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

export const DEFAULT_EDITOR: EditorState = {
    brightness: 100, contrast: 100, saturate: 100,
    blur: 0, sepia: 0, hueRotate: 0, grayscale: 0,
    rotate: 0, flipH: false, flipV: false, format: "png",
};

export const EDITOR_PRESETS: { key: string; emoji: string; values: Partial<EditorState> }[] = [
    { key: "original", emoji: "🔄", values: {} },
    { key: "vintage", emoji: "📜", values: { brightness: 110, contrast: 85, saturate: 70, sepia: 40 } },
    { key: "bw", emoji: "⬛", values: { grayscale: 100, contrast: 120 } },
    { key: "warm", emoji: "🌅", values: { brightness: 105, saturate: 130, sepia: 15 } },
    { key: "cool", emoji: "❄️", values: { brightness: 105, saturate: 90, contrast: 110 } },
    { key: "vivid", emoji: "🌈", values: { brightness: 110, contrast: 120, saturate: 150 } },
];

export type HubFeedTab = "newest" | "trending" | "top_tipped" | "mine" | "following" | "mining";
export type HubProfileTab = "posts" | "liked" | "saved";

/* ===================== ZUSTAND STORE ===================== */

interface HubStoreState {
    // App-level
    lang: Lang;
    theme: "dark" | "light";
    viewMode: "gallery" | "hub";
    toast: string | null;
    toastType: "" | "col-toast-success" | "col-toast-error";

    // Gallery
    allImages: ImageItem[];
    folders: string[];
    loading: boolean;
    totalBytes: number;
    activeTab: string;
    currentPage: number;
    searchQuery: string;
    typeFilter: "all" | "images" | "videos";

    sortBy: "random" | "name" | "newest" | "size";
    favorites: Set<string>;
    favoritesOrder: string[];
    downloadCounts: Record<string, number>;
    gridCols: number;
    isMasonry: boolean;
    isInfinite: boolean;
    translatedNames: Record<string, string>;

    // Hub Social
    hubPosts: any[];
    hubLoading: boolean;
    hubFeedTab: HubFeedTab;
    hubPage: number;
    hubHasMore: boolean;
    hubProfileFilter: string | null;
    hubProfileTab: HubProfileTab;
    topCreators: any[];
    hubLayout: "grid" | "feed";
    hubSearch: string;
    hubBookmarks: Set<number>;
    hubDetailPost: any | null;
    showCreatePost: boolean;
    showTipModal: { postId: number; creatorAddress: string; creatorName: string } | null;
    showLikeList: number | null;
    likeListData: any[];
    hubLikeAnim: number | null;
    hubMoreOpen: number | null;
    shareMenuPostId: number | null;
    showEditProfile: boolean;
    profileRefreshTrigger: number;
    showChatInbox: boolean;

    // Inline comments
    inlineCommentTexts: Record<number, string>;
    inlineCommentLoading: Record<number, boolean>;
    carouselIndices: Record<number, number>;

    // Lightbox
    lightboxIndex: number | null;
    hubEditorOverride: { src: string; name: string; isVideo: boolean; folder?: string; bytes?: number; duration?: number } | null;
    imgLoading: boolean;
    isSlideshow: boolean;
    editor: EditorState;
    showEditor: boolean;
    showOriginal: boolean;
    removingBg: boolean;
    bgRemovedUrl: string | null;
    bgRemovedName: string;
    bgFailed: boolean;
    editorTab: number;
    showSharePanel: boolean;
    showQr: boolean;
    teleLinkName: string;
    showTeleGuide: boolean;
    dragY: number;

    // UI
    headerHidden: boolean;
    showScrollTop: boolean;
    showLangMenu: boolean;
    showTabsMenu: boolean;
    showSortMenu: boolean;
    deferredPrompt: Event | null;

    // Actions
    setLang: (lang: Lang) => void;
    setTheme: (fn: ("dark" | "light") | ((prev: "dark" | "light") => "dark" | "light")) => void;
    setViewMode: (mode: "gallery" | "hub") => void;
    setToast: (toast: string | null) => void;
    setToastType: (toastType: "" | "col-toast-success" | "col-toast-error") => void;

    setAllImages: (images: ImageItem[]) => void;
    setFolders: (folders: string[]) => void;
    setLoading: (loading: boolean) => void;
    setTotalBytes: (bytes: number) => void;
    setActiveTab: (tab: string) => void;
    setCurrentPage: (fn: number | ((prev: number) => number)) => void;
    setSearchQuery: (query: string) => void;
    setTypeFilter: (filter: "all" | "images" | "videos") => void;

    setSortBy: (sort: "random" | "name" | "newest" | "size") => void;
    setFavorites: (fn: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    setFavoritesOrder: (fn: string[] | ((prev: string[]) => string[])) => void;
    setDownloadCounts: (fn: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
    setGridCols: (cols: number) => void;
    setIsMasonry: (v: boolean) => void;
    setIsInfinite: (v: boolean) => void;
    setTranslatedNames: (names: Record<string, string>) => void;

    setHubPosts: (fn: any[] | ((prev: any[]) => any[])) => void;
    setHubLoading: (loading: boolean) => void;
    setHubFeedTab: (tab: HubFeedTab) => void;
    setHubPage: (fn: number | ((prev: number) => number)) => void;
    setHubHasMore: (v: boolean) => void;
    setHubProfileFilter: (filter: string | null) => void;
    setHubProfileTab: (tab: HubProfileTab) => void;
    setTopCreators: (creators: any[]) => void;
    setHubLayout: (layout: "grid" | "feed") => void;
    setHubSearch: (search: string) => void;
    setHubBookmarks: (fn: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
    setHubDetailPost: (post: any | null) => void;
    setShowCreatePost: (v: boolean) => void;
    setShowTipModal: (v: { postId: number; creatorAddress: string; creatorName: string } | null) => void;
    setShowLikeList: (v: number | null) => void;
    setLikeListData: (data: any[]) => void;
    setHubLikeAnim: (v: number | null) => void;
    setHubMoreOpen: (v: number | null) => void;
    setShareMenuPostId: (v: number | null) => void;
    setShowEditProfile: (v: boolean) => void;
    setProfileRefreshTrigger: (fn: number | ((prev: number) => number)) => void;
    setShowChatInbox: (v: boolean) => void;

    setInlineCommentTexts: (fn: (prev: Record<number, string>) => Record<number, string>) => void;
    setInlineCommentLoading: (fn: (prev: Record<number, boolean>) => Record<number, boolean>) => void;
    setCarouselIndices: (fn: (prev: Record<number, number>) => Record<number, number>) => void;

    setLightboxIndex: (fn: number | null | ((prev: number | null) => number | null)) => void;
    setHubEditorOverride: (v: { src: string; name: string; isVideo: boolean; folder?: string; bytes?: number; duration?: number } | null) => void;
    setImgLoading: (v: boolean) => void;
    setIsSlideshow: (v: boolean) => void;
    setEditor: (editor: EditorState) => void;
    setShowEditor: (v: boolean) => void;
    setShowOriginal: (v: boolean) => void;
    setRemovingBg: (v: boolean) => void;
    setBgRemovedUrl: (fn: string | null | ((prev: string | null) => string | null)) => void;
    setBgRemovedName: (name: string) => void;
    setBgFailed: (v: boolean) => void;
    setEditorTab: (tab: number) => void;
    setShowSharePanel: (v: boolean) => void;
    setShowQr: (v: boolean) => void;
    setTeleLinkName: (name: string) => void;
    setShowTeleGuide: (v: boolean) => void;
    setDragY: (y: number) => void;

    setHeaderHidden: (v: boolean) => void;
    setShowScrollTop: (v: boolean) => void;
    setShowLangMenu: (v: boolean) => void;
    setShowTabsMenu: (v: boolean) => void;
    setShowSortMenu: (v: boolean) => void;
    setDeferredPrompt: (v: Event | null) => void;
}

export const useHubStore = create<HubStoreState>((set) => ({
    // App-level
    lang: "en" as Lang,
    theme: "dark",
    viewMode: "gallery",
    toast: null,
    toastType: "",

    // Gallery
    allImages: [],
    folders: [],
    loading: true,
    totalBytes: 0,
    activeTab: "all",
    currentPage: 1,
    searchQuery: "",
    typeFilter: "all",

    sortBy: "random",
    favorites: new Set(),
    favoritesOrder: [],
    downloadCounts: {},
    gridCols: 5,
    isMasonry: false,
    isInfinite: false,
    translatedNames: {},

    // Hub Social
    hubPosts: [],
    hubLoading: false,
    hubFeedTab: "newest",
    hubPage: 0,
    hubHasMore: true,
    hubProfileFilter: null,
    hubProfileTab: "posts",
    topCreators: [],
    hubLayout: "grid",
    hubSearch: "",
    hubBookmarks: new Set(),
    hubDetailPost: null,
    showCreatePost: false,
    showTipModal: null,
    showLikeList: null,
    likeListData: [],
    hubLikeAnim: null,
    hubMoreOpen: null,
    shareMenuPostId: null,
    showEditProfile: false,
    profileRefreshTrigger: 0,
    showChatInbox: false,

    // Inline comments
    inlineCommentTexts: {},
    inlineCommentLoading: {},
    carouselIndices: {},

    // Lightbox
    lightboxIndex: null,
    hubEditorOverride: null,
    imgLoading: false,
    isSlideshow: false,
    editor: { ...DEFAULT_EDITOR },
    showEditor: false,
    showOriginal: false,
    removingBg: false,
    bgRemovedUrl: null,
    bgRemovedName: "",
    bgFailed: false,
    editorTab: 0,
    showSharePanel: false,
    showQr: false,
    teleLinkName: "",
    showTeleGuide: false,
    dragY: 0,

    // UI
    headerHidden: false,
    showScrollTop: false,
    showLangMenu: false,
    showTabsMenu: false,
    showSortMenu: false,
    deferredPrompt: null,

    // Actions (simple setters)
    setLang: (lang) => set({ lang }),
    setTheme: (fn) => set((state) => ({ theme: typeof fn === "function" ? fn(state.theme) : fn })),
    setViewMode: (viewMode) => set({ viewMode }),
    setToast: (toast) => set({ toast }),
    setToastType: (toastType) => set({ toastType }),

    setAllImages: (allImages) => set({ allImages }),
    setFolders: (folders) => set({ folders }),
    setLoading: (loading) => set({ loading }),
    setTotalBytes: (totalBytes) => set({ totalBytes }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setCurrentPage: (fn) => set((state) => ({ currentPage: typeof fn === "function" ? fn(state.currentPage) : fn })),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setTypeFilter: (typeFilter) => set({ typeFilter }),

    setSortBy: (sortBy) => set({ sortBy }),
    setFavorites: (fn) => set((state) => ({ favorites: typeof fn === "function" ? fn(state.favorites) : fn })),
    setFavoritesOrder: (fn) => set((state) => ({ favoritesOrder: typeof fn === "function" ? fn(state.favoritesOrder) : fn })),
    setDownloadCounts: (fn) => set((state) => ({ downloadCounts: typeof fn === "function" ? fn(state.downloadCounts) : fn })),
    setGridCols: (gridCols) => set({ gridCols }),
    setIsMasonry: (isMasonry) => set({ isMasonry }),
    setIsInfinite: (isInfinite) => set({ isInfinite }),
    setTranslatedNames: (translatedNames) => set({ translatedNames }),

    setHubPosts: (fn) => set((state) => ({ hubPosts: typeof fn === "function" ? fn(state.hubPosts) : fn })),
    setHubLoading: (hubLoading) => set({ hubLoading }),
    setHubFeedTab: (hubFeedTab) => set({ hubFeedTab }),
    setHubPage: (fn) => set((state) => ({ hubPage: typeof fn === "function" ? fn(state.hubPage) : fn })),
    setHubHasMore: (hubHasMore) => set({ hubHasMore }),
    setHubProfileFilter: (hubProfileFilter) => set({ hubProfileFilter }),
    setHubProfileTab: (hubProfileTab) => set({ hubProfileTab }),
    setTopCreators: (topCreators) => set({ topCreators }),
    setHubLayout: (hubLayout) => set({ hubLayout }),
    setHubSearch: (hubSearch) => set({ hubSearch }),
    setHubBookmarks: (fn) => set((state) => ({ hubBookmarks: typeof fn === "function" ? fn(state.hubBookmarks) : fn })),
    setHubDetailPost: (hubDetailPost) => set({ hubDetailPost }),
    setShowCreatePost: (showCreatePost) => set({ showCreatePost }),
    setShowTipModal: (showTipModal) => set({ showTipModal }),
    setShowLikeList: (showLikeList) => set({ showLikeList }),
    setLikeListData: (likeListData) => set({ likeListData }),
    setHubLikeAnim: (hubLikeAnim) => set({ hubLikeAnim }),
    setHubMoreOpen: (hubMoreOpen) => set({ hubMoreOpen }),
    setShareMenuPostId: (shareMenuPostId) => set({ shareMenuPostId }),
    setShowEditProfile: (showEditProfile) => set({ showEditProfile }),
    setProfileRefreshTrigger: (fn) => set((state) => ({ profileRefreshTrigger: typeof fn === "function" ? fn(state.profileRefreshTrigger) : fn })),
    setShowChatInbox: (showChatInbox) => set({ showChatInbox }),

    setInlineCommentTexts: (fn) => set((state) => ({ inlineCommentTexts: fn(state.inlineCommentTexts) })),
    setInlineCommentLoading: (fn) => set((state) => ({ inlineCommentLoading: fn(state.inlineCommentLoading) })),
    setCarouselIndices: (fn) => set((state) => ({ carouselIndices: fn(state.carouselIndices) })),

    setLightboxIndex: (fn) => set((state) => ({ lightboxIndex: typeof fn === "function" ? fn(state.lightboxIndex) : fn })),
    setHubEditorOverride: (hubEditorOverride) => set({ hubEditorOverride }),
    setImgLoading: (imgLoading) => set({ imgLoading }),
    setIsSlideshow: (isSlideshow) => set({ isSlideshow }),
    setEditor: (editor) => set({ editor }),
    setShowEditor: (showEditor) => set({ showEditor }),
    setShowOriginal: (showOriginal) => set({ showOriginal }),
    setRemovingBg: (removingBg) => set({ removingBg }),
    setBgRemovedUrl: (fn) => set((state) => ({ bgRemovedUrl: typeof fn === "function" ? fn(state.bgRemovedUrl) : fn })),
    setBgRemovedName: (bgRemovedName) => set({ bgRemovedName }),
    setBgFailed: (bgFailed) => set({ bgFailed }),
    setEditorTab: (editorTab) => set({ editorTab }),
    setShowSharePanel: (showSharePanel) => set({ showSharePanel }),
    setShowQr: (showQr) => set({ showQr }),
    setTeleLinkName: (teleLinkName) => set({ teleLinkName }),
    setShowTeleGuide: (showTeleGuide) => set({ showTeleGuide }),
    setDragY: (dragY) => set({ dragY }),

    setHeaderHidden: (headerHidden) => set({ headerHidden }),
    setShowScrollTop: (showScrollTop) => set({ showScrollTop }),
    setShowLangMenu: (showLangMenu) => set({ showLangMenu }),
    setShowTabsMenu: (showTabsMenu) => set({ showTabsMenu }),
    setShowSortMenu: (showSortMenu) => set({ showSortMenu }),
    setDeferredPrompt: (deferredPrompt) => set({ deferredPrompt }),
}));
