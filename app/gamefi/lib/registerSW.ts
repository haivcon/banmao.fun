// lib/registerSW.ts
// Service Worker registration utility for PWA support - GameFi Hub

// Re-export install prompt functions from centralized BasePWABanner
export {
    initInstallPrompt,
    promptInstall,
    canPromptInstall
} from '../../../components/pwa/BasePWABanner';

/**
 * Register the service worker for PWA functionality
 */
export function registerServiceWorker(): void {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) {
        console.log('[PWA GameFi] Service workers not supported');
        return;
    }

    // Register after page load for better performance
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js', { scope: '/gamefi/' })
            .then((registration) => {
                console.log('[PWA GameFi] Service worker registered:', registration.scope);

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[PWA GameFi] New content available, refresh to update');
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('[PWA GameFi] Service worker registration failed:', error);
            });
    });
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
