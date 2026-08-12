const CLOUDINARY_WIDTHS = [200, 400, 600] as const;

export function toCloudinaryThumb(secureUrl: string, width = 400): string {
    return secureUrl.replace(
        "/upload/",
        `/upload/c_fill,w_${width},h_${width},f_auto,q_auto/`,
    );
}

export function toCloudinarySrcSet(secureUrl: string): string {
    return CLOUDINARY_WIDTHS
        .map((width) => `${toCloudinaryThumb(secureUrl, width)} ${width}w`)
        .join(", ");
}

export function collectionImageSizes(gridCols: number): string {
    const desktopWidth = Math.max(1, Math.ceil(100 / Math.max(1, gridCols)));
    return `(max-width: 768px) 33vw, ${desktopWidth}vw`;
}
