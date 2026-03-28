// Shared helper functions for the Collection page
import type { EditorState, ImageItem } from "../stores/useHubStore";

/* ===================== NAME / LABEL HELPERS ===================== */

export function publicIdToName(publicId: string): string {
    const filename = publicId.split("/").pop() || publicId;
    let name = filename.replace(/^banmao_/i, "");
    name = name.replace(/_[a-z0-9]{5,8}$/i, "");
    name = name.replace(/_\d{10,}$/, "");
    return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

export function folderLabel(folder: string): string {
    const last = folder.split("/").pop() || folder;
    return last.replace(/^banmao\s*/i, "").trim() || last;
}

export function folderIcon(folder: string): string {
    const f = folder.toLowerCase();
    if (f.includes("avatar")) return "🎭";
    if (f.includes("countries") || f.includes("country")) return "🌍";
    if (f.includes("expression")) return "😺";
    if (f.includes("parody")) return "🎬";
    if (f.includes("sticker")) return "⭐";
    return "📁";
}

/* ===================== CLOUDINARY TRANSFORM ===================== */

export function toThumb(secureUrl: string): string {
    return secureUrl.replace("/upload/", "/upload/c_fill,w_400,h_400,f_auto,q_auto/");
}

export function toVideoThumb(secureUrl: string): string {
    return secureUrl
        .replace("/video/upload/", "/video/upload/c_fill,w_400,h_400,f_jpg,q_auto/")
        .replace(/\.[^.]+$/, ".jpg");
}

/* ===================== FORMAT HELPERS ===================== */

export function formatDuration(seconds: number | undefined): string {
    if (!seconds) return "";
    const s = Math.round(seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `0:${sec.toString().padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
    return (bytes / 1073741824).toFixed(1) + " GB";
}

export function shortAddr(addr: string): string {
    return addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "";
}

export function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60000) return "now";
    if (diff < 3600000) return Math.floor(diff / 60000) + "m";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h";
    return Math.floor(diff / 86400000) + "d";
}

/* ===================== EDITOR CSS ===================== */

export function editorFilterCSS(e: EditorState): string {
    return `brightness(${e.brightness}%) contrast(${e.contrast}%) saturate(${e.saturate}%) blur(${e.blur}px) sepia(${e.sepia}%) hue-rotate(${e.hueRotate}deg) grayscale(${e.grayscale}%)`;
}

export function editorTransformCSS(e: EditorState): string {
    return `rotate(${e.rotate}deg) scaleX(${e.flipH ? -1 : 1}) scaleY(${e.flipV ? -1 : 1})`;
}

/* ===================== DOWNLOAD HELPERS ===================== */

export async function downloadWithEdits(src: string, name: string, editor: EditorState) {
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
    } catch {
        window.open(src, "_blank");
    }
}

export async function downloadImageBlob(src: string, name: string) {
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
    } catch {
        window.open(src, "_blank");
    }
}

