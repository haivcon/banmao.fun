// app/collection/lib/offlineMode.ts
// Offline mode: queue actions while offline, sync when back

interface QueuedAction {
    id: string;
    type: 'like' | 'comment' | 'reaction' | 'checkin';
    payload: Record<string, any>;
    timestamp: number;
}

const QUEUE_KEY = 'banmao-offline-queue';

export function isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function getQueue(): QueuedAction[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveQueue(queue: QueuedAction[]) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueAction(type: QueuedAction['type'], payload: Record<string, any>) {
    const queue = getQueue();
    queue.push({
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        payload,
        timestamp: Date.now(),
    });
    saveQueue(queue);
}

export function dequeueAction(id: string) {
    const queue = getQueue().filter(a => a.id !== id);
    saveQueue(queue);
}

const ACTION_ENDPOINTS: Record<string, { url: string; method: string }> = {
    like: { url: '/api/hub/likes', method: 'POST' },
    comment: { url: '/api/hub/comments', method: 'POST' },
    reaction: { url: '/api/hub/reactions', method: 'POST' },
    checkin: { url: '/api/hub/checkin', method: 'POST' },
};

export async function syncQueue() {
    if (!isOnline()) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    const now = Date.now();
    const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

    for (const action of queue) {
        // Remove stale actions older than 24h
        if (now - action.timestamp > MAX_AGE) {
            dequeueAction(action.id);
            continue;
        }
        const endpoint = ACTION_ENDPOINTS[action.type];
        if (!endpoint) {
            dequeueAction(action.id);
            continue;
        }
        try {
            const res = await fetch(endpoint.url, {
                method: endpoint.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(action.payload),
            });
            if (res.ok) {
                dequeueAction(action.id);
            }
        } catch {
            // Will retry on next sync
            break;
        }
    }
}

/**
 * Start listening for online events and sync automatically
 */
export function startOfflineSync() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
        syncQueue();
    });

    // Initial sync
    if (isOnline()) {
        syncQueue();
    }
}

/**
 * Perform an action with offline support — try online first, queue if offline
 */
export async function onlineOrQueue(
    type: QueuedAction['type'],
    payload: Record<string, any>,
    onlineCallback: () => Promise<any>
): Promise<{ queued: boolean; result?: any }> {
    if (isOnline()) {
        try {
            const result = await onlineCallback();
            return { queued: false, result };
        } catch {
            enqueueAction(type, payload);
            return { queued: true };
        }
    } else {
        enqueueAction(type, payload);
        return { queued: true };
    }
}
