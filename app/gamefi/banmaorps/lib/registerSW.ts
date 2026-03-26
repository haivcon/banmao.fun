// lib/registerSW.ts
// Service Worker registration utility for PWA support - BANMAO RPS

// Re-export install prompt functions from centralized BasePWABanner
export {
    initInstallPrompt,
    promptInstall,
    canPromptInstall
} from '../../../../components/pwa/BasePWABanner';

/**
 * Register the service worker for PWA functionality
 */
export function registerServiceWorker(): void {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) {
        console.log('[PWA RPS] Service workers not supported');
        return;
    }

    // Register after page load for better performance
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js', { scope: '/gamefi/banmaorps/' })
            .then((registration) => {
                console.log('[PWA RPS] Service worker registered:', registration.scope);

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[PWA RPS] New content available, refresh to update');
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('[PWA RPS] Service worker registration failed:', error);
            });
    });
}

/**
 * Unregister all service workers (useful for debugging)
 */
export async function unregisterServiceWorkers(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
    console.log('[PWA RPS] All service workers unregistered');
}

/**
 * Check if app is running in standalone mode (installed as PWA)
 */
export function isRunningAsPWA(): boolean {
    if (typeof window === 'undefined') return false;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (navigator as any).standalone === true;
    const isFromHomescreen = document.referrer === '' && !window.opener;

    return isStandalone || isIOSStandalone || isFromHomescreen;
}
