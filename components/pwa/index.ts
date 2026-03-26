// components/pwa/index.ts
// Re-export all PWA components

export { default as BasePWABanner, initInstallPrompt, promptInstall, canPromptInstall, onPromptAvailable } from './BasePWABanner';
export type { PWABannerConfig } from './BasePWABanner';

export { default as GameMenuInstallButton } from './GameMenuInstallButton';
export type { GameMenuInstallButtonProps } from './GameMenuInstallButton';
