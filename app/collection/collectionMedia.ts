const CLOUDINARY_WIDTHS = [200, 400, 600] as const;

function canTransformCloudinaryImage(secureUrl: string): boolean {
    if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//i.test(secureUrl)) return false;
    if (/\.gif(?:\?|$)/i.test(secureUrl)) return false;
    const deliveryPath = secureUrl.split("/image/upload/")[1] || "";
    const firstSegment = deliveryPath.split("/")[0];
    return /^v\d+$/.test(firstSegment) || !/^(?:[a-z]{1,4}_[^/]+)(?:,|$)/i.test(firstSegment);
}

export function toCloudinaryThumb(secureUrl: string, width = 400): string {
    if (!canTransformCloudinaryImage(secureUrl)) return secureUrl;
    return secureUrl.replace(
        "/upload/",
        `/upload/c_fill,w_${width},h_${width},dpr_auto,f_auto,q_auto:eco/`,
    );
}

export function toCloudinarySrcSet(secureUrl: string): string {
    if (!canTransformCloudinaryImage(secureUrl)) return "";
    return CLOUDINARY_WIDTHS
        .map((width) => `${toCloudinaryThumb(secureUrl, width)} ${width}w`)
        .join(", ");
}

export function collectionImageSizes(gridCols: number): string {
    const desktopWidth = Math.max(1, Math.ceil(100 / Math.max(1, gridCols)));
    return `(max-width: 768px) 33vw, ${desktopWidth}vw`;
}
