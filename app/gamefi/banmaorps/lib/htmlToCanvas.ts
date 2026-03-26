/**
 * HTML to Canvas utility for screenshots
 */

export type Html2CanvasFn = (
    element: HTMLElement,
    options?: Record<string, any>
) => Promise<HTMLCanvasElement>;

let html2canvasPromise: Promise<Html2CanvasFn | null> | null = null;

/**
 * Dynamically load html2canvas library
 */
export async function ensureHtml2Canvas(): Promise<Html2CanvasFn | null> {
    if (typeof window === "undefined") return null;

    if (html2canvasPromise) return html2canvasPromise;

    html2canvasPromise = (async () => {
        try {
            // @ts-ignore - html2canvas types may not be available
            const mod = await import("html2canvas");
            const fn = mod.default ?? mod;
            if (typeof fn === "function") return fn as Html2CanvasFn;
            return null;
        } catch (error) {
            console.error("Failed to load html2canvas:", error);
            return null;
        }
    })();

    return html2canvasPromise;
}

/**
 * Capture element as canvas
 */
export async function captureToCanvas(
    element: HTMLElement,
    options?: Record<string, any>
): Promise<HTMLCanvasElement | null> {
    const html2canvas = await ensureHtml2Canvas();
    if (!html2canvas) return null;

    try {
        return await html2canvas(element, {
            useCORS: true,
            allowTaint: false,
            backgroundColor: null,
            ...options,
        });
    } catch (error) {
        console.error("Failed to capture element:", error);
        return null;
    }
}

/**
 * Capture element as data URL
 */
export async function captureToDataUrl(
    element: HTMLElement,
    format: "image/png" | "image/jpeg" = "image/png",
    quality?: number,
    options?: Record<string, any>
): Promise<string | null> {
    const canvas = await captureToCanvas(element, options);
    if (!canvas) return null;

    try {
        return canvas.toDataURL(format, quality);
    } catch (error) {
        console.error("Failed to convert canvas to data URL:", error);
        return null;
    }
}

/**
 * Capture element as Blob
 */
export async function captureToBlob(
    element: HTMLElement,
    format: "image/png" | "image/jpeg" = "image/png",
    quality?: number,
    options?: Record<string, any>
): Promise<Blob | null> {
    const canvas = await captureToCanvas(element, options);
    if (!canvas) return null;

    return new Promise((resolve) => {
        canvas.toBlob(
            (blob) => resolve(blob),
            format,
            quality
        );
    });
}
