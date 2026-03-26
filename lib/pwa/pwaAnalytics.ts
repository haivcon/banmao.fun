// lib/pwa/pwaAnalytics.ts
// PWA Analytics tracking for install/update/dismiss events

import { AppId, getBrowserLanguage } from './pwaConfig';

const ANALYTICS_KEY = 'pwa_analytics';

export interface PWAEvent {
    type: 'install' | 'update' | 'dismiss' | 'banner_shown';
    appId: AppId;
    language: string;
    timestamp: number;
    metadata?: Record<string, string>;
}

interface AnalyticsData {
    events: PWAEvent[];
    summary: {
        installs: Record<AppId, number>;
        updates: Record<AppId, number>;
        dismisses: Record<AppId, number>;
        bannerShown: Record<AppId, number>;
        byLanguage: Record<string, number>;
    };
}

/**
 * Get current analytics data from localStorage
 */
function getAnalyticsData(): AnalyticsData {
    if (typeof window === 'undefined') {
        return createEmptyAnalytics();
    }

    try {
        const stored = localStorage.getItem(ANALYTICS_KEY);
        if (!stored) return createEmptyAnalytics();
        return JSON.parse(stored);
    } catch {
        return createEmptyAnalytics();
    }
}

/**
 * Save analytics data to localStorage
 */
function saveAnalyticsData(data: AnalyticsData): void {
    if (typeof window === 'undefined') return;

    try {
        // Keep only last 100 events to prevent localStorage bloat
        if (data.events.length > 100) {
            data.events = data.events.slice(-100);
        }
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('[PWA Analytics] Failed to save:', error);
    }
}

/**
 * Create empty analytics structure
 */
function createEmptyAnalytics(): AnalyticsData {
    return {
        events: [],
        summary: {
            installs: { main: 0, gamefi: 0, rps: 0, snake: 0, slots: 0 },
            updates: { main: 0, gamefi: 0, rps: 0, snake: 0, slots: 0 },
            dismisses: { main: 0, gamefi: 0, rps: 0, snake: 0, slots: 0 },
            bannerShown: { main: 0, gamefi: 0, rps: 0, snake: 0, slots: 0 },
            byLanguage: {},
        },
    };
}

/**
 * Track a PWA event
 */
function trackEvent(event: PWAEvent): void {
    const data = getAnalyticsData();

    // Add event
    data.events.push(event);

    // Update summary
    const { type, appId, language } = event;

    switch (type) {
        case 'install':
            data.summary.installs[appId]++;
            break;
        case 'update':
            data.summary.updates[appId]++;
            break;
        case 'dismiss':
            data.summary.dismisses[appId]++;
            break;
        case 'banner_shown':
            data.summary.bannerShown[appId]++;
            break;
    }

    // Track by language
    data.summary.byLanguage[language] = (data.summary.byLanguage[language] || 0) + 1;

    saveAnalyticsData(data);

    console.log(`[PWA Analytics] ${type} event for ${appId} (${language})`);
}

/**
 * Track install event
 */
export function trackInstall(appId: AppId, language?: string): void {
    trackEvent({
        type: 'install',
        appId,
        language: language || getBrowserLanguage(),
        timestamp: Date.now(),
    });
}

/**
 * Track update event
 */
export function trackUpdate(appId: AppId, fromVersion?: string, toVersion?: string): void {
    trackEvent({
        type: 'update',
        appId,
        language: getBrowserLanguage(),
        timestamp: Date.now(),
        metadata: {
            fromVersion: fromVersion || 'unknown',
            toVersion: toVersion || 'unknown',
        },
    });
}

/**
 * Track dismiss event
 */
export function trackDismiss(appId: AppId, language?: string): void {
    trackEvent({
        type: 'dismiss',
        appId,
        language: language || getBrowserLanguage(),
        timestamp: Date.now(),
    });
}

/**
 * Track banner shown event
 */
export function trackBannerShown(appId: AppId, language?: string): void {
    trackEvent({
        type: 'banner_shown',
        appId,
        language: language || getBrowserLanguage(),
        timestamp: Date.now(),
    });
}

/**
 * Get analytics summary
 */
export function getAnalyticsSummary(): AnalyticsData['summary'] {
    return getAnalyticsData().summary;
}

/**
 * Get recent events
 */
export function getRecentEvents(count: number = 10): PWAEvent[] {
    const data = getAnalyticsData();
    return data.events.slice(-count);
}

/**
 * Clear all analytics data
 */
export function clearAnalytics(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ANALYTICS_KEY);
    console.log('[PWA Analytics] Cleared all analytics data');
}

/**
 * Export analytics as JSON string (for debugging/reporting)
 */
export function exportAnalytics(): string {
    return JSON.stringify(getAnalyticsData(), null, 2);
}
