export * from './types';
import { SlotsLanguage, SlotsTranslations } from './types';
import { en } from './en';
import { vi } from './vi';
import { zh } from './zh';
import { ko } from './ko';
import { ru } from './ru';
import { id } from './id';

export const slotsTranslations: Record<SlotsLanguage, SlotsTranslations> = {
    en,
    vi,
    zh,
    ko,
    ru,
    id
};

// Helper function to get browser language
export function getSlotsBrowserLanguage(): SlotsLanguage {
    if (typeof navigator === 'undefined') return 'en';
    const browserLang = navigator.language.toLowerCase().split('-')[0];
    if (browserLang in slotsTranslations) {
        return browserLang as SlotsLanguage;
    }
    return 'en';
}
