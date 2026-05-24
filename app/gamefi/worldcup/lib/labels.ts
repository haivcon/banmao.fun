export function cleanLabel(value: string | undefined, fallback = "") {
    return (value || fallback)
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}
