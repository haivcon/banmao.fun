// lib/shareUtils.ts
// Web Share API utilities with fallback to clipboard

/**
 * Check if Web Share API is available
 */
export function canNativeShare(): boolean {
    if (typeof navigator === "undefined") return false;
    return "share" in navigator && typeof navigator.share === "function";
}

/**
 * Check if the specific share data can be shared
 */
export async function canShareData(data: ShareData): Promise<boolean> {
    if (!canNativeShare()) return false;
    if ("canShare" in navigator && typeof navigator.canShare === "function") {
        return navigator.canShare(data);
    }
    return true; // Assume yes if canShare is not available
}

/**
 * Share data using Web Share API with fallback
 */
export async function shareData(data: ShareData): Promise<{ success: boolean; method: "native" | "clipboard" | "failed" }> {
    // Try native share first
    if (canNativeShare()) {
        try {
            await navigator.share(data);
            return { success: true, method: "native" };
        } catch (error) {
            // User cancelled or share failed
            if ((error as Error).name === "AbortError") {
                return { success: false, method: "failed" };
            }
            // Fall through to clipboard
        }
    }

    // Fallback to clipboard
    const textToShare = data.url || data.text || "";
    if (textToShare && typeof navigator !== "undefined" && navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(textToShare);
            return { success: true, method: "clipboard" };
        } catch {
            return { success: false, method: "failed" };
        }
    }

    return { success: false, method: "failed" };
}

/**
 * Generate room invite URL
 */
export function getRoomInviteUrl(roomId: string | number): string {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://banmao.fun";
    return `${baseUrl}/?room=${roomId}`;
}

/**
 * Share a room invite link
 */
export async function shareRoomInvite(
    roomId: string | number,
    stake: string,
    lang: string = "en"
): Promise<{ success: boolean; method: "native" | "clipboard" | "failed" }> {
    const url = getRoomInviteUrl(roomId);

    const titles: Record<string, string> = {
        en: "Join my BANMAO RPS game!",
        vi: "Tham gia game BANMAO RPS của tôi!",
        zh: "加入我的BANMAO RPS游戏！",
        ko: "내 BANMAO RPS 게임에 참여하세요!",
        id: "Bergabunglah dengan game BANMAO RPS saya!",
        ru: "Присоединяйтесь к моей игре BANMAO RPS!",
    };

    const texts: Record<string, string> = {
        en: `Room #${roomId} • Stake: ${stake} $BANMAO`,
        vi: `Phòng #${roomId} • Cược: ${stake} $BANMAO`,
        zh: `房间 #${roomId} • 押注: ${stake} $BANMAO`,
        ko: `방 #${roomId} • 판돈: ${stake} $BANMAO`,
        id: `Ruangan #${roomId} • Taruhan: ${stake} $BANMAO`,
        ru: `Комната #${roomId} • Ставка: ${stake} $BANMAO`,
    };

    const title = titles[lang] || titles.en;
    const text = texts[lang] || texts.en;

    return shareData({ title, text, url });
}

/**
 * Share game result
 */
export async function shareGameResult(
    roomId: string | number,
    result: "win" | "lose" | "draw",
    amount: string,
    lang: string = "en"
): Promise<{ success: boolean; method: "native" | "clipboard" | "failed" }> {
    const url = getRoomInviteUrl(roomId);

    const resultEmoji = {
        win: "🏆",
        lose: "😢",
        draw: "🤝",
    };

    const resultTexts: Record<string, Record<string, string>> = {
        win: {
            en: `${resultEmoji.win} I won ${amount} $BANMAO in BANMAO RPS!`,
            vi: `${resultEmoji.win} Tôi thắng ${amount} $BANMAO trong BANMAO RPS!`,
            zh: `${resultEmoji.win} 我在BANMAO RPS赢了 ${amount} $BANMAO！`,
            ko: `${resultEmoji.win} BANMAO RPS에서 ${amount} $BANMAO를 획득했습니다!`,
            id: `${resultEmoji.win} Saya menang ${amount} $BANMAO di BANMAO RPS!`,
            ru: `${resultEmoji.win} Я выиграл ${amount} $BANMAO в BANMAO RPS!`,
        },
        lose: {
            en: `${resultEmoji.lose} Lost ${amount} $BANMAO in BANMAO RPS. Want a rematch?`,
            vi: `${resultEmoji.lose} Thua ${amount} $BANMAO trong BANMAO RPS. Muốn thử lại không?`,
            zh: `${resultEmoji.lose} 在BANMAO RPS输了 ${amount} $BANMAO。再来一局？`,
            ko: `${resultEmoji.lose} BANMAO RPS에서 ${amount} $BANMAO를 잃었습니다. 재대결?`,
            id: `${resultEmoji.lose} Kalah ${amount} $BANMAO di BANMAO RPS. Mau rematch?`,
            ru: `${resultEmoji.lose} Проиграл ${amount} $BANMAO в BANMAO RPS. Хотите реванш?`,
        },
        draw: {
            en: `${resultEmoji.draw} Draw in BANMAO RPS! Come challenge me!`,
            vi: `${resultEmoji.draw} Hòa trong BANMAO RPS! Đến thách đấu tôi nào!`,
            zh: `${resultEmoji.draw} BANMAO RPS平局！来挑战我吧！`,
            ko: `${resultEmoji.draw} BANMAO RPS 무승부! 저에게 도전하세요!`,
            id: `${resultEmoji.draw} Seri di BANMAO RPS! Ayo tantang saya!`,
            ru: `${resultEmoji.draw} Ничья в BANMAO RPS! Давайте сыграем!`,
        },
    };

    const text = resultTexts[result][lang] || resultTexts[result].en;

    return shareData({ title: "BANMAO RPS", text, url });
}
