// lib/notificationUtils.ts
// Browser notification utilities for PWA

/**
 * Check if browser notifications are supported
 */
export function isNotificationSupported(): boolean {
    if (typeof window === "undefined") return false;
    return "Notification" in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
    if (!isNotificationSupported()) return "unsupported";
    return Notification.permission;
}

/**
 * Request notification permission
 * Returns the permission status after request
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
    if (!isNotificationSupported()) return "unsupported";

    try {
        const permission = await Notification.requestPermission();
        return permission;
    } catch (error) {
        console.error("[Notification] Permission request failed:", error);
        return "denied";
    }
}

/**
 * Notification types for game events
 */
export type GameNotificationType =
    | "your_turn_commit"
    | "your_turn_reveal"
    | "opponent_joined"
    | "opponent_committed"
    | "opponent_revealed"
    | "game_won"
    | "game_lost"
    | "game_draw"
    | "timeout_warning"
    | "room_created";

/**
 * i18n messages for notifications
 */
const NOTIFICATION_MESSAGES: Record<string, Record<GameNotificationType, { title: string; body: string }>> = {
    en: {
        your_turn_commit: { title: "Your turn!", body: "Select your move in Room #{roomId}" },
        your_turn_reveal: { title: "Reveal time!", body: "Reveal your move in Room #{roomId}" },
        opponent_joined: { title: "Opponent joined!", body: "Someone joined Room #{roomId}. Make your move!" },
        opponent_committed: { title: "Opponent ready!", body: "Your opponent has committed in Room #{roomId}" },
        opponent_revealed: { title: "Opponent revealed!", body: "Your opponent revealed. Check Room #{roomId}!" },
        game_won: { title: "🏆 You won!", body: "Congratulations! You won {amount} $BANMAO" },
        game_lost: { title: "😢 You lost", body: "Better luck next time! Room #{roomId}" },
        game_draw: { title: "🤝 Draw!", body: "It's a tie in Room #{roomId}" },
        timeout_warning: { title: "⏰ Time running out!", body: "Only {time} left in Room #{roomId}" },
        room_created: { title: "Room created!", body: "Room #{roomId} is ready. Share it!" },
    },
    vi: {
        your_turn_commit: { title: "Đến lượt bạn!", body: "Chọn nước đi trong Phòng #{roomId}" },
        your_turn_reveal: { title: "Giờ mở bài!", body: "Mở bài trong Phòng #{roomId}" },
        opponent_joined: { title: "Đối thủ vào!", body: "Có người vào Phòng #{roomId}. Ra quân thôi!" },
        opponent_committed: { title: "Đối thủ sẵn sàng!", body: "Đối thủ đã chọn bài trong Phòng #{roomId}" },
        opponent_revealed: { title: "Đối thủ mở bài!", body: "Đối thủ đã mở. Xem Phòng #{roomId}!" },
        game_won: { title: "🏆 Bạn thắng!", body: "Chúc mừng! Bạn thắng {amount} $BANMAO" },
        game_lost: { title: "😢 Bạn thua", body: "Lần sau may mắn hơn! Phòng #{roomId}" },
        game_draw: { title: "🤝 Hòa!", body: "Hòa trong Phòng #{roomId}" },
        timeout_warning: { title: "⏰ Sắp hết giờ!", body: "Còn {time} trong Phòng #{roomId}" },
        room_created: { title: "Tạo phòng thành công!", body: "Phòng #{roomId} đã sẵn sàng. Chia sẻ ngay!" },
    },
    zh: {
        your_turn_commit: { title: "轮到你了!", body: "在房间 #{roomId} 选择你的招式" },
        your_turn_reveal: { title: "揭示时间!", body: "在房间 #{roomId} 揭示你的招式" },
        opponent_joined: { title: "对手加入!", body: "有人加入了房间 #{roomId}。出招吧!" },
        opponent_committed: { title: "对手准备好了!", body: "对手已在房间 #{roomId} 提交" },
        opponent_revealed: { title: "对手揭示了!", body: "对手已揭示。查看房间 #{roomId}!" },
        game_won: { title: "🏆 你赢了!", body: "恭喜！你赢得了 {amount} $BANMAO" },
        game_lost: { title: "😢 你输了", body: "下次好运！房间 #{roomId}" },
        game_draw: { title: "🤝 平局!", body: "房间 #{roomId} 平局" },
        timeout_warning: { title: "⏰ 时间快到了!", body: "房间 #{roomId} 还剩 {time}" },
        room_created: { title: "房间创建成功!", body: "房间 #{roomId} 已就绪。分享吧!" },
    },
    ko: {
        your_turn_commit: { title: "당신 차례!", body: "방 #{roomId}에서 수를 선택하세요" },
        your_turn_reveal: { title: "공개 시간!", body: "방 #{roomId}에서 수를 공개하세요" },
        opponent_joined: { title: "상대 입장!", body: "방 #{roomId}에 누군가 들어왔습니다. 수를 내세요!" },
        opponent_committed: { title: "상대 준비완료!", body: "상대가 방 #{roomId}에서 선택했습니다" },
        opponent_revealed: { title: "상대 공개!", body: "상대가 공개했습니다. 방 #{roomId} 확인!" },
        game_won: { title: "🏆 승리!", body: "축하합니다! {amount} $BANMAO 획득!" },
        game_lost: { title: "😢 패배", body: "다음에 행운을! 방 #{roomId}" },
        game_draw: { title: "🤝 무승부!", body: "방 #{roomId} 무승부" },
        timeout_warning: { title: "⏰ 시간 부족!", body: "방 #{roomId}에 {time} 남음" },
        room_created: { title: "방 생성 완료!", body: "방 #{roomId} 준비 완료. 공유하세요!" },
    },
    id: {
        your_turn_commit: { title: "Giliran Anda!", body: "Pilih gerakan di Ruangan #{roomId}" },
        your_turn_reveal: { title: "Waktu ungkap!", body: "Ungkap gerakan di Ruangan #{roomId}" },
        opponent_joined: { title: "Lawan bergabung!", body: "Seseorang masuk Ruangan #{roomId}. Mainkan!" },
        opponent_committed: { title: "Lawan siap!", body: "Lawan sudah memilih di Ruangan #{roomId}" },
        opponent_revealed: { title: "Lawan mengungkap!", body: "Lawan mengungkap. Cek Ruangan #{roomId}!" },
        game_won: { title: "🏆 Anda menang!", body: "Selamat! Anda menang {amount} $BANMAO" },
        game_lost: { title: "😢 Anda kalah", body: "Semoga beruntung lain kali! Ruangan #{roomId}" },
        game_draw: { title: "🤝 Seri!", body: "Seri di Ruangan #{roomId}" },
        timeout_warning: { title: "⏰ Waktu hampir habis!", body: "Tersisa {time} di Ruangan #{roomId}" },
        room_created: { title: "Ruangan dibuat!", body: "Ruangan #{roomId} siap. Bagikan!" },
    },
    ru: {
        your_turn_commit: { title: "Ваш ход!", body: "Выберите ход в Комнате #{roomId}" },
        your_turn_reveal: { title: "Время раскрытия!", body: "Раскройте ход в Комнате #{roomId}" },
        opponent_joined: { title: "Противник вошёл!", body: "Кто-то вошёл в Комнату #{roomId}. Делайте ход!" },
        opponent_committed: { title: "Противник готов!", body: "Противник сделал выбор в Комнате #{roomId}" },
        opponent_revealed: { title: "Противник раскрыл!", body: "Противник раскрыл. Проверьте Комнату #{roomId}!" },
        game_won: { title: "🏆 Вы выиграли!", body: "Поздравляем! Вы выиграли {amount} $BANMAO" },
        game_lost: { title: "😢 Вы проиграли", body: "Удачи в следующий раз! Комната #{roomId}" },
        game_draw: { title: "🤝 Ничья!", body: "Ничья в Комнате #{roomId}" },
        timeout_warning: { title: "⏰ Время заканчивается!", body: "Осталось {time} в Комнате #{roomId}" },
        room_created: { title: "Комната создана!", body: "Комната #{roomId} готова. Поделитесь!" },
    },
};

/**
 * Get notification message with variable substitution
 */
function getNotificationMessage(
    type: GameNotificationType,
    lang: string,
    variables: Record<string, string | number> = {}
): { title: string; body: string } {
    const messages = NOTIFICATION_MESSAGES[lang] || NOTIFICATION_MESSAGES.en;
    const message = messages[type] || NOTIFICATION_MESSAGES.en[type];

    let title = message.title;
    let body = message.body;

    // Replace variables like {roomId}, {amount}, {time}
    Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        title = title.replace(placeholder, String(value));
        body = body.replace(placeholder, String(value));
    });

    // Also replace #{roomId} pattern
    if (variables.roomId !== undefined) {
        title = title.replace("#{roomId}", String(variables.roomId));
        body = body.replace("#{roomId}", String(variables.roomId));
    }

    return { title, body };
}

/**
 * Show a game notification
 */
export async function showGameNotification(
    type: GameNotificationType,
    options: {
        roomId?: string | number;
        amount?: string;
        time?: string;
        lang?: string;
        onClick?: () => void;
    } = {}
): Promise<Notification | null> {
    const permission = getNotificationPermission();
    if (permission !== "granted") {
        console.log("[Notification] Permission not granted:", permission);
        return null;
    }

    const lang = options.lang || getBrowserLanguage();
    const variables: Record<string, string | number> = {};
    if (options.roomId) variables.roomId = options.roomId;
    if (options.amount) variables.amount = options.amount;
    if (options.time) variables.time = options.time;

    const { title, body } = getNotificationMessage(type, lang, variables);

    try {
        const notification = new Notification(title, {
            body,
            icon: "/games/rps/logo.jpg",
            badge: "/pwa/main/icon-96x96.png",
            tag: `banmao-${type}-${options.roomId || "general"}`,
            requireInteraction: type === "your_turn_commit" || type === "your_turn_reveal" || type === "timeout_warning",
        });

        if (options.onClick) {
            notification.onclick = () => {
                window.focus();
                options.onClick?.();
                notification.close();
            };
        } else {
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }

        return notification;
    } catch (error) {
        console.error("[Notification] Failed to show:", error);
        return null;
    }
}

/**
 * Detect browser language
 */
function getBrowserLanguage(): string {
    if (typeof navigator === "undefined") return "en";
    const lang = navigator.language || "en";
    const code = lang.split("-")[0].toLowerCase();
    return NOTIFICATION_MESSAGES[code] ? code : "en";
}

/**
 * Schedule a reminder notification
 */
export function scheduleNotification(
    type: GameNotificationType,
    delayMs: number,
    options: {
        roomId?: string | number;
        amount?: string;
        time?: string;
        lang?: string;
        onClick?: () => void;
    } = {}
): NodeJS.Timeout | null {
    if (getNotificationPermission() !== "granted") return null;

    return setTimeout(() => {
        showGameNotification(type, options);
    }, delayMs);
}

/**
 * Cancel a scheduled notification
 */
export function cancelScheduledNotification(timerId: NodeJS.Timeout | null): void {
    if (timerId) {
        clearTimeout(timerId);
    }
}
