// lib/pwa/pwaUtils.ts
// Shared PWA utilities for standalone detection, version management, and localStorage cleanup

import { AppId, PWA_APPS, getStorageKey, STORAGE_KEYS } from './pwaConfig';

const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if app is running in standalone mode (installed as PWA)
 */
export function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;

    // Check display-mode media query
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

    // Check iOS-specific property
    const isIOSStandalone = (navigator as any).standalone === true;

    return isStandaloneMode || isIOSStandalone;
}

/**
 * Check if current device is iOS
 */
export function isIOSDevice(): boolean {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
}

/**
 * Check if app was installed - with proper cleanup when not in standalone mode
 * Uses GameFi's approach: clear installed flag when not in standalone mode
 */
export function checkInstalled(appId: AppId): boolean {
    if (typeof window === 'undefined') return false;

    const installedKey = getStorageKey(appId, STORAGE_KEYS.INSTALLED);
    const inStandalone = isStandalone();

    // If not in standalone mode, clear the installed flag
    // This handles the case when user uninstalls the PWA
    if (!inStandalone) {
        localStorage.removeItem(installedKey);
        return false;
    }

    return true;
}

/**
 * Mark app as installed and store version
 */
export function setInstalled(appId: AppId): void {
    if (typeof window === 'undefined') return;

    const config = PWA_APPS[appId];
    const installedKey = getStorageKey(appId, STORAGE_KEYS.INSTALLED);
    const versionKey = getStorageKey(appId, STORAGE_KEYS.VERSION);
    const dismissedKey = getStorageKey(appId, STORAGE_KEYS.DISMISSED);

    localStorage.setItem(installedKey, 'true');
    localStorage.setItem(versionKey, config.version);
    localStorage.removeItem(dismissedKey); // Clear dismissed flag when installed
}

/**
 * Check if an update is available based on stored version
 */
export function checkForUpdate(appId: AppId): boolean {
    if (typeof window === 'undefined') return false;

    const config = PWA_APPS[appId];
    const versionKey = getStorageKey(appId, STORAGE_KEYS.VERSION);
    const storedVersion = localStorage.getItem(versionKey);

    if (!storedVersion) return false;

    // If stored version differs from current, update is available
    return storedVersion !== config.version;
}

/**
 * Get stored version for an app
 */
export function getAppVersion(appId: AppId): string | null {
    if (typeof window === 'undefined') return null;

    const versionKey = getStorageKey(appId, STORAGE_KEYS.VERSION);
    return localStorage.getItem(versionKey);
}

/**
 * Update stored version to current
 */
export function updateVersion(appId: AppId): void {
    if (typeof window === 'undefined') return;

    const config = PWA_APPS[appId];
    const versionKey = getStorageKey(appId, STORAGE_KEYS.VERSION);
    localStorage.setItem(versionKey, config.version);
}

/**
 * Check if banner was dismissed recently (within 24 hours)
 */
export function wasDismissed(appId: AppId): boolean {
    if (typeof window === 'undefined') return true;

    const dismissedKey = getStorageKey(appId, STORAGE_KEYS.DISMISSED);
    const dismissedAt = localStorage.getItem(dismissedKey);

    if (!dismissedAt) return false;

    const dismissTime = parseInt(dismissedAt, 10);
    if (isNaN(dismissTime)) return false;

    return Date.now() - dismissTime < DISMISS_DURATION_MS;
}

/**
 * Mark banner as dismissed
 */
export function setDismissed(appId: AppId): void {
    if (typeof window === 'undefined') return;

    const dismissedKey = getStorageKey(appId, STORAGE_KEYS.DISMISSED);
    localStorage.setItem(dismissedKey, Date.now().toString());
}

/**
 * Clean up all localStorage keys for an app
 * Called when app is being reinstalled or for cleanup
 */
export function cleanupLocalStorage(appId: AppId): void {
    if (typeof window === 'undefined') return;

    const prefix = PWA_APPS[appId].storagePrefix;
    const keysToRemove: string[] = [];

    // Find all keys with this prefix
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
        }
    }

    // Remove them
    keysToRemove.forEach(key => localStorage.removeItem(key));

    console.log(`[PWA ${appId}] Cleaned up ${keysToRemove.length} localStorage keys`);
}

/**
 * Clean up all PWA-related localStorage for all apps
 * Used for complete reset
 */
export function cleanupAllPWAStorage(): void {
    const appIds: AppId[] = ['main', 'gamefi', 'rps', 'snake'];
    appIds.forEach(appId => cleanupLocalStorage(appId));
}
