// app/collection/lib/notifications.ts
// Push notification helper for BanmaoHub

export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const result = await Notification.requestPermission();
    return result === 'granted';
}

export function showNotification(title: string, options?: NotificationOptions) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Use service worker if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
                icon: '/banmao-icon-192.png',
                badge: '/banmao-icon-192.png',
                ...options,
            } as any);
        });
    } else {
        new Notification(title, {
            icon: '/banmao-icon-192.png',
            ...options,
        });
    }
}

export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        return reg;
    } catch {
        return null;
    }
}

// Notification types for BanmaoHub
export type NotificationType = 'like' | 'comment' | 'tip' | 'follow' | 'story';

export function createHubNotification(type: NotificationType, data: {
    username?: string;
    postCaption?: string;
    amount?: string;
}) {
    const messages: Record<NotificationType, { title: string; body: string }> = {
        like: {
            title: '❤️ New Like',
            body: `${data.username || 'Someone'} liked your post${data.postCaption ? ': ' + data.postCaption.slice(0, 50) : ''}`,
        },
        comment: {
            title: '💬 New Comment',
            body: `${data.username || 'Someone'} commented on your post`,
        },
        tip: {
            title: '💰 New Tip!',
            body: `${data.username || 'Someone'} tipped ${data.amount || ''}`,
        },
        follow: {
            title: '👥 New Follower',
            body: `${data.username || 'Someone'} started following you`,
        },
        story: {
            title: '📸 New Story',
            body: `${data.username || 'Someone'} posted a new story`,
        },
    };

    const msg = messages[type];
    showNotification(msg.title, {
        body: msg.body,
        tag: `hub-${type}-${Date.now()}`,
    });
}
