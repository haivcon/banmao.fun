/**
 * Clipboard utility functions
 */

/**
 * Copy text to clipboard with fallback for older browsers
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    if (typeof window === "undefined") return false;

    try {
        // Modern API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }

        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            const result = document.execCommand("copy");
            return result;
        } finally {
            document.body.removeChild(textarea);
        }
    } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        return false;
    }
}

/**
 * Read text from clipboard
 */
export async function readFromClipboard(): Promise<string | null> {
    if (typeof window === "undefined") return null;

    try {
        if (navigator.clipboard && navigator.clipboard.readText) {
            return await navigator.clipboard.readText();
        }
        return null;
    } catch (error) {
        console.error("Failed to read from clipboard:", error);
        return null;
    }
}
